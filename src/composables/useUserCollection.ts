import { db } from "@/firebase/firebase";
import type { PublicUserData } from "@/firebase/types";
import { doc, DocumentReference } from "firebase/firestore";
import { onUnmounted, ref, watch, type Ref } from "vue";
import { useLiveDoc } from "./useLiveDoc";

export default function useUserCollection(
	userIds: Ref<string[]>,
	onError?: (userId: string) => void
): Ref<Record<string, Ref<null | PublicUserData>>> {
	const publicUserData = ref<Record<string, Ref<PublicUserData | null>>>({});
	const docReleasers = new Map<string, () => void>();

	onUnmounted(() => {
		docReleasers.forEach((release) => release());
	});

	watch(userIds, (requestedIds) => {
		const requestedIdsSet = new Set(requestedIds);
		const currentIds = Object.keys(publicUserData.value);
		const currentIdsSet = new Set(currentIds);

		const newUsers = requestedIds.filter((userId) => !currentIdsSet.has(userId));
		newUsers.forEach((userId) => {
			const userPublicRef = doc(db, "users", userId, "public", "data") as DocumentReference<PublicUserData>;
			const liveDoc = useLiveDoc(userPublicRef, () => onError?.(userId));
			publicUserData.value[userId] = liveDoc.data;
			docReleasers.set(userId, liveDoc.release);
		});

		const removedUsers = currentIds.filter((userId) => !requestedIdsSet.has(userId));
		removedUsers.forEach((userId) => {
			delete publicUserData.value[userId];
			docReleasers.get(userId)?.();
			docReleasers.delete(userId);
		});
	});

	// const publicUserData = computed(() =>
	// 	Object.fromEntries(
	// 		userIds.value.map((userId) => {
	// 			const userPublicRef = doc(db, "users", userId, "public", "data") as DocumentReference<PublicUserData>;
	// 			const ref = useLiveDoc(userPublicRef, () => onError?.(userId)); // todo // ! we shouldn't place a composable inside a `computed` as it breaks vue lifecycle
	// 			return [userId, ref];
	// 		}),
	// 	),
	// );

	return publicUserData;
}
