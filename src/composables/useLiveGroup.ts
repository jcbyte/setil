import { db } from "@/firebase/firebase";
import type { GroupData, GroupUserData, Transaction } from "@/firebase/types";
import { collection, CollectionReference, doc, DocumentReference } from "firebase/firestore";
import { computed, type Ref } from "vue";
import { useLiveCollection } from "./useLiveCollection";
import { useLiveDoc } from "./useLiveDoc";

export interface Group {
	data: GroupData;
	users: Record<string, GroupUserData>;
	transactions: Record<string, Transaction>;
}

export function useLiveGroup(groupId: string | null, onError?: () => void): Ref<Group | null> {
	if (!groupId) return computed(() => null); // ? This requires `groupId` to be static

	const groupRef = doc(db, "groups", groupId) as DocumentReference<GroupData>;
	const liveGroupData = useLiveDoc(groupRef, onError);
	const groupUsersRef = collection(groupRef, "users") as CollectionReference<GroupUserData>;
	const liveGroupUsers = useLiveCollection(groupUsersRef, onError);
	const groupTransactionsRef = collection(groupRef, "transactions") as CollectionReference<Transaction>;
	const liveGroupTransactions = useLiveCollection(groupTransactionsRef, onError);

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
