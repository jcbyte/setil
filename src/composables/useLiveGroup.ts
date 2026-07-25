import { db } from "@/firebase/firebase";
import type { GroupData, GroupUserData, Transaction } from "@/firebase/types";
import { collection, CollectionReference, doc, DocumentReference } from "firebase/firestore";
import { ref, watch, watchEffect, type Ref } from "vue";
import { acquireLiveCollection } from "../firebase/live/acquireLiveCollection";
import { acquireLiveDoc } from "../firebase/live/acquireLiveDoc";

export interface Group {
	data: GroupData | null;
	users: Record<string, GroupUserData> | null;
	transactions: Record<string, Transaction> | null;
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
 * @returns {Ref<Group | null>} Reactive ref containing the complete group data, or null
 *   if groupId is null or the group has not loaded yet
 */
export function useLiveGroup(groupId: Ref<string | null>, onError?: (network: boolean) => void): Ref<Group | null> {
	const activeGroupData = ref<Group | null>(null);

	watch(
		groupId,
		(id, _, onCleanup) => {
			activeGroupData.value = null;
			if (!id) return;

			// Get the live data and collections for the group
			const groupRef = doc(db, "groups", id) as DocumentReference<GroupData>;
			const { data: liveGroupData, release: releaseGroupData } = acquireLiveDoc(groupRef, onError);

			const groupUsersRef = collection(groupRef, "users") as CollectionReference<GroupUserData>;
			const {
				items: liveGroupUsers,
				loaded: liveGroupUsersLoaded,
				release: releaseGroupUsers,
			} = acquireLiveCollection(groupUsersRef, onError);

			const groupTransactionsRef = collection(groupRef, "transactions") as CollectionReference<Transaction>;
			const {
				items: liveGroupTransactions,
				loaded: liveGroupTransactionsLoaded,
				release: releaseGroupTransactions,
			} = acquireLiveCollection(groupTransactionsRef, onError);

			// Collapse the group data into a single value
			const stopWatchEffect = watchEffect(() => {
				activeGroupData.value = {
					data: liveGroupData.value,
					users: liveGroupUsersLoaded.value ? liveGroupUsers : null,
					transactions: liveGroupTransactionsLoaded.value ? liveGroupTransactions : null,
				};
			});

			// Automatically cleanup the live subscribers when going out of scope
			onCleanup(() => {
				stopWatchEffect();
				releaseGroupData();
				releaseGroupUsers();
				releaseGroupTransactions();
			});
		},
		{ immediate: true },
	);

	return activeGroupData;
}
