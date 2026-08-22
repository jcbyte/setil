import {
	getCountFromServer,
	query,
	type CollectionReference,
	type FirestoreError,
	type QueryOrderByConstraint,
} from "firebase/firestore";
import { computed, ref, type Ref } from "vue";
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

export function acquireLivePagedCollection<T>(
	colRef: CollectionReference<T>,
	order: QueryOrderByConstraint,
	pageSize = 10,
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

	// Get the document count from server
	// ! Note that this is a "one-shot", it will not update in realtime
	void getCountFromServer(orderedQuery)
		.then((snapshot) => {
			documentCount.value = snapshot.data().count;
		})
		.catch((error: FirestoreError) => {
			if (error.code === "not-found" || error.code === "permission-denied") onError?.(false);
			else onError?.(true);
		});

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
	}

	// Initially load the first page
	expandBy(pageSize);

	const tupleItems = computed(() => {
		const start = (currentPage.value - 1) * pageSize;
		return expandedItems.value.slice(start, start + pageSize);
	});
	const loaded = computed(() => {
		if (!itemsLoaded.value || documentCount.value === null) return false;

		// Firestore can first emit a cache snapshot containing only the previous query limit (none!).
		// Do not pronounce loaded until the expected items exist.
		const requiredItemCount = Math.min(currentPage.value * pageSize, documentCount.value);
		return expandedItems.value.length >= requiredItemCount;
	});

	return { tupleItems, currentPage, totalPages, loaded, goToPage, release: releaseQuery };
}
