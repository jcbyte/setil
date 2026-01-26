import { db } from "@/firebase/firebase";
import type { PublicUserData } from "@/firebase/types";
import { doc, DocumentReference } from "firebase/firestore";
import { onUnmounted, ref, watch, type Ref } from "vue";
import { useLiveDoc } from "./useLiveDoc";

export default function useLiveUserCollection(
	userIds: Ref<string[]>,
	onError?: (userId: string) => void,
): Ref<Record<string, Ref<PublicUserData | null>>> {
	const publicUserData = ref<Record<string, Ref<PublicUserData | null>>>({}); // todo this should be a reactive
	const docReleasers = new Map<string, () => void>();

	onUnmounted(() => {
		docReleasers.forEach((release) => release());
		docReleasers.clear();
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

	return publicUserData;
}
