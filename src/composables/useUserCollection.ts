import { db } from "@/firebase/firebase";
import type { PublicUserData } from "@/firebase/types";
import { doc, DocumentReference } from "firebase/firestore";
import { computed, type Ref } from "vue";
import { useLiveDoc } from "./useLiveDoc";

export default function useUserCollection(
	userIds: Ref<string[]>,
	onError?: (userId: string) => void,
): Ref<Record<string, Ref<null | PublicUserData>>> {
	const publicUserData = computed(() =>
		Object.fromEntries(
			userIds.value.map((userId) => {
				const userPublicRef = doc(db, "users", userId, "public", "data") as DocumentReference<PublicUserData>;
				const ref = useLiveDoc(userPublicRef, () => onError?.(userId)); // todo // ! we shouldn't place a composable inside a `computed` as it breaks vue lifecycle
				return [userId, ref];
			}),
		),
	);

	return publicUserData;
}
