import { db } from "@/firebase/firebase";
import type { GroupData, GroupUserData, Transaction } from "@/firebase/types";
import { collection, CollectionReference, doc, DocumentReference } from "firebase/firestore";
import { computed, onUnmounted, type Ref } from "vue";
import { useLiveCollection } from "./useLiveCollection";
import { useLiveDoc } from "./useLiveDoc";

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
 * @param {string | null} groupId - The static id of the group to subscribe to
 * @param {Function} [onError] - Optional callback for error handling. Called with:
 *   - network: boolean - true if error is network related, false if access related
 * @returns {Ref<Group | null>} Reactive ref containing the complete group data, or null
 *   if groupId is null or the group has not loaded yet
 */
export function useLiveGroup(groupId: string, onError?: (network: boolean) => void): Ref<Group> {
	// Get the live data and collections for the group
	const groupRef = doc(db, "groups", groupId) as DocumentReference<GroupData>;
	const { data: liveGroupData, release: releaseGroupData } = useLiveDoc(groupRef, onError);

	const groupUsersRef = collection(groupRef, "users") as CollectionReference<GroupUserData>;
	const {
		items: liveGroupUsers,
		loaded: liveGroupUsersLoaded,
		release: releaseGroupUsers,
	} = useLiveCollection(groupUsersRef, onError);

	const groupTransactionsRef = collection(groupRef, "transactions") as CollectionReference<Transaction>;
	const {
		items: liveGroupTransactions,
		loaded: liveGroupTransactionsLoaded,
		release: releaseGroupTransactions,
	} = useLiveCollection(groupTransactionsRef, onError);

	// Automatically cleanup the live subscribers when going out of scope
	onUnmounted(() => {
		releaseGroupData();
		releaseGroupUsers();
		releaseGroupTransactions();
	});

	// Return null until all parts of the group have loaded
	const group = computed<Group>(() => ({
		data: liveGroupData.value,
		users: liveGroupUsersLoaded.value ? liveGroupUsers : null,
		transactions: liveGroupTransactionsLoaded.value ? liveGroupTransactions : null,
	}));

	return group;
}
