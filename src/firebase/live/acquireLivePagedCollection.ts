import {
	getCountFromServer,
	query,
	type CollectionReference,
	type FirestoreError,
	type QueryOrderByConstraint,
} from "firebase/firestore";
import { computed, ref, watchEffect, type Ref } from "vue";
import { acquireLiveExpandingQuery } from "./acquireLiveExpandingQuery";
import type { ErrorHandler } from "./types";

export interface AcquiredLivePagedCollection<T> {
	tupleItems: Ref<[string, T][]>;
	currentPage: Ref<number>;
	totalPages: Ref<number | null>;
	loaded: Ref<boolean>;
	goToPage: (page: number) => void;
	release: () => void;
}

/**
 * Functions for subscribing to a Firestore collection with live updates. Paginating documents in a specific order.
 *
 * The subscription should be cleaned up via the release function.
 *
 * @template T - The type of documents in the collection
 * @param {CollectionReference<T>} colRef - Reference to the Firestore collection
 * @param {QueryOrderByConstraint} order - The ordering of documents to page by
 * @param {number} pageSize - The size (in documents) of each page
 * @param {Function} [onError] - Optional callback for error handling.
 *   - network: boolean - true if error is network related, false if access related
 * @returns {AcquiredLivePagedCollection<T>} Object containing:
 *   - tupleItems: Reactive ref containing the pages Object entries of document ids to document data (in order)
 *   - currentPage: Reactive ref containing the currently viewing page
 *   - totalPages: Reactive ref containing the total number of pages in the entire collection
 *   - loaded: Reactive ref indicating if the items have been loaded
 *   - goToPage: Function to load documents for a specific page
 *   - release: Function to unsubscribe and clean up the listener
 */
export function acquireLivePagedCollection<T>(
	colRef: CollectionReference<T>,
	order: QueryOrderByConstraint,
	pageSize: number = 10,
	onError?: ErrorHandler,
): AcquiredLivePagedCollection<T> {
	if (pageSize <= 0) throw new RangeError("pageSize must be a positive integer");

	const orderedQuery = query(colRef, order);
	const {
		tupleItems: expandedItems,
		expandBy,
		loaded: itemsLoaded,
		release: releaseQuery,
	} = acquireLiveExpandingQuery(orderedQuery, onError);

	const currentPage = ref<number>(1);
	const documentCount = ref<number | null>(null);
	let expandedToPage = 1;

	// ! Note: This count wont update when other users delete/add transactions
	const refreshDocumentCount = async (): Promise<number | null> =>
		getCountFromServer(orderedQuery)
			.then((snapshot) => {
				documentCount.value = snapshot.data().count;
				return documentCount.value;
			})
			.catch((error: FirestoreError) => {
				if (error.code === "not-found" || error.code === "permission-denied") onError?.(false);
				else onError?.(true);
				return null;
			});
	refreshDocumentCount();

	const totalPages = computed(() => (documentCount.value !== null ? Math.ceil(documentCount.value / pageSize) : null));

	function goToPage(page: number) {
		if (page < 1) return;
		if (totalPages.value !== null && page > totalPages.value) return;

		const pageExpansion = page - expandedToPage;
		if (pageExpansion > 0) {
			expandBy(pageExpansion * pageSize);
			expandedToPage = page;
		}

		currentPage.value = page;

		// The count is not live, so refresh it when navigating.
		void refreshDocumentCount().then((count) => {
			if (count === null) return;

			// If a deletion removed the requested last page, move back to the new last page.
			const lastPage = Math.max(1, Math.ceil(count / pageSize));
			if (currentPage.value > lastPage) currentPage.value = lastPage;
		});
	}

	// Initially load the first page
	expandBy(pageSize);

	const tupleItems = computed(() => {
		const start = (currentPage.value - 1) * pageSize;
		return expandedItems.value.slice(start, start + pageSize);
	});

	const loaded = ref(false);
	watchEffect(() => {
		// Expanding the query means a new page is being fetched.
		if (!itemsLoaded.value) {
			loaded.value = false;
			return;
		}

		if (documentCount.value === null) return;

		// Firestore can first emit a cache snapshot containing only the previous query limit.
		// Wait for the requested page to arrive, then keep it loaded if live data later shrinks.
		const requiredItemCount = Math.min(currentPage.value * pageSize, documentCount.value);
		if (expandedItems.value.length >= requiredItemCount) loaded.value = true;
	});

	return { tupleItems, currentPage, totalPages, loaded, goToPage, release: releaseQuery };
}
