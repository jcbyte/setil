import { db } from "@/firebase/firebase";
import type { GroupData, GroupUserData, Transaction } from "@/firebase/types";
import { collection, CollectionReference, doc, DocumentReference } from "firebase/firestore";
import { computed, onUnmounted, type Ref } from "vue";
import { useLiveCollection } from "./useLiveCollection";
import { useLiveDoc } from "./useLiveDoc";

export interface Group {
	data: GroupData;
	users: Record<string, GroupUserData>;
	transactions: Record<string, Transaction>;
}

export function useLiveGroup(groupId: string | null, onError?: () => void): Ref<Group | null> {
	if (!groupId) return computed(() => null);

	const groupRef = doc(db, "groups", groupId) as DocumentReference<GroupData>;
	const { data: liveGroupData, release: releaseGroupData } = useLiveDoc(groupRef, onError);
	const groupUsersRef = collection(groupRef, "users") as CollectionReference<GroupUserData>;
	const { items: liveGroupUsers, release: releaseGroupUsers } = useLiveCollection(groupUsersRef, onError);
	const groupTransactionsRef = collection(groupRef, "transactions") as CollectionReference<Transaction>;
	const { items: liveGroupTransactions, release: releaseGroupTransactions } = useLiveCollection(
		groupTransactionsRef,
		onError
	);

	onUnmounted(() => {
		releaseGroupData();
		releaseGroupUsers();
		releaseGroupTransactions();
	});

	const group = computed<Group | null>(() => {
		if (liveGroupData.value === null || liveGroupUsers.value === null || liveGroupTransactions.value === null)
			return null;

		return {
			data: liveGroupData.value,
			users: liveGroupUsers.value,
			transactions: liveGroupTransactions.value,
		};
	});

	return group;
}
