import { app } from "@/firebase/firebase";
import type { GroupData, Transaction, UserData } from "@/firebase/types";
import { collection, CollectionReference, doc, DocumentReference, getFirestore } from "firebase/firestore";
import { computed, type Ref } from "vue";
import { useLiveCollection } from "./useLiveCollection";
import { useLiveDoc } from "./useLiveDoc";

interface Group {
	data: GroupData;
	users: Record<string, Readonly<UserData>>;
	transactions: Record<string, Readonly<Transaction>>;
}

export function useLiveGroup(groupId: string, onError?: () => void): Ref<Group | null> {
	const db = getFirestore(app);

	const groupRef = doc(db, "groups", groupId) as DocumentReference<GroupData>;
	const liveGroupData = useLiveDoc(groupRef, onError);
	const groupUsersRef = collection(groupRef, "users") as CollectionReference<UserData>;
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
