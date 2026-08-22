import { db } from "@/firebase/firebase";
import { acquireLivePagedCollection } from "@/firebase/live/acquireLivePagedCollection";
import type { Transaction } from "@/types/firestore";
import { collection, CollectionReference, orderBy } from "firebase/firestore";
import { ref, watch, watchEffect, type Ref } from "vue";

export interface PaginatedGroupTransactions {
	data: [string, Transaction][] | null;
	currentPage: number;
	totalPages: number | null;
	goToPage: (pg: number) => void;
}

/**
 * Composable for subscribing to a complete group with all its related data.
 *
 * Fetches and syncs the group document, all users in the group, and all transactions
 * in a single reactive object. Automatically handles cleanup of all subscriptions
 * on component unmount.
 *
 * @param {Ref<string | null>} groupId - The reactive id of the group to subscribe to
 * @param {Function} [onError] - Optional callback for error handling. Called with:
 *   - network: boolean - true if error is network related, false if access related
 * @returns {Ref<PaginatedGroupTransactions | null>} Reactive ref containing the complete group data, or null
 *   if groupId is null or the group has not loaded yet
 */
export function useLivePaginatedGroupTransactions(
	groupId: Ref<string | null>,
	onError?: (network: boolean) => void,
): Ref<PaginatedGroupTransactions | null> {
	const activeTransactionsData = ref<PaginatedGroupTransactions | null>(null);

	watch(
		groupId,
		(id, _, onCleanup) => {
			activeTransactionsData.value = null;
			if (!id) return;

			// Get the live data and collections for the group
			const groupTransactionsRef = collection(db, "groups", id, "transactions") as CollectionReference<Transaction>;
			const {
				tupleItems,
				currentPage,
				totalPages,
				loaded,
				goToPage,
				release: releaseAcquireTransactions,
			} = acquireLivePagedCollection(groupTransactionsRef, orderBy("date", "asc"), undefined, onError);

			// Collapse the group data into a single value
			const stopWatchEffect = watchEffect(() => {
				activeTransactionsData.value = {
					data: loaded.value ? tupleItems.value : null,
					currentPage: currentPage.value,
					totalPages: totalPages.value,
					goToPage,
				};
			});

			// Automatically cleanup the live subscribers when going out of scope
			onCleanup(() => {
				stopWatchEffect();
				releaseAcquireTransactions();
			});
		},
		{ immediate: true },
	);

	return activeTransactionsData;
}
