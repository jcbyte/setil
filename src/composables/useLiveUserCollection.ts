import { db } from "@/firebase/firebase";
import type { PublicUserData } from "@/firebase/types";
import { doc, DocumentReference } from "firebase/firestore";
import { onUnmounted, reactive, watch, type Ref } from "vue";
import { useLiveDoc } from "./useLiveDoc";

export default function useLiveUserCollection(
	userIds: Ref<string[]>,
	onError?: (network: boolean, userId: string) => void,
): Record<string, Ref<PublicUserData | null>> {
	const publicUserData = reactive<Record<string, Ref<PublicUserData | null>>>({});
	const docReleasers = new Map<string, () => void>();

	onUnmounted(() => {
		docReleasers.forEach((release) => release());
		docReleasers.clear();
	});

	watch(userIds, (requestedIds) => {
		const requestedIdsSet = new Set(requestedIds);
		const currentIds = Object.keys(publicUserData);
		const currentIdsSet = new Set(currentIds);

		const newUsers = requestedIds.filter((userId) => !currentIdsSet.has(userId));
		newUsers.forEach((userId) => {
			const userPublicRef = doc(db, "users", userId, "public", "data") as DocumentReference<PublicUserData>;
			const liveDoc = useLiveDoc(userPublicRef, (nw) => onError?.(nw, userId));
			publicUserData[userId] = liveDoc.data;
			docReleasers.set(userId, liveDoc.release);
		});

		const removedUsers = currentIds.filter((userId) => !requestedIdsSet.has(userId));
		removedUsers.forEach((userId) => {
			delete publicUserData[userId];
			docReleasers.get(userId)?.();
			docReleasers.delete(userId);
		});
	});

	return publicUserData;
}
