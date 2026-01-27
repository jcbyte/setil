import { db } from "@/firebase/firebase";
import type { PublicUserData } from "@/firebase/types";
import { doc, DocumentReference } from "firebase/firestore";
import { onUnmounted, reactive, watch, type Ref } from "vue";
import { useLiveDoc } from "./useLiveDoc";

/**
 * Composable for subscribing to public profiles for multiple users.
 *
 * Accepts a reactive ref of user IDs and dynamically manages subscriptions.
 *
 * @param {Ref<string[]>} userIds - Reactive ref containing array of user IDs to fetch
 * @param {Function} [onError] - Optional callback for error handling. Called with:
 *   - network: boolean - true if error is network related, false if access related
 *   - userId: string - the id of the user where the error occurred
 * @returns {Record<string, Ref<PublicUserData | null>>} Reactive record mapping user IDs
 *   to refs containing their live public profile data or null if not loaded
 */
export default function useLiveUserCollection(
	userIds: Ref<string[]>,
	onError?: (network: boolean, userId: string) => void,
): Record<string, Ref<PublicUserData | null>> {
	const publicUserData = reactive<Record<string, Ref<PublicUserData | null>>>({});
	const docReleasers = new Map<string, () => void>();

	// Automatically cleanup the live subscribers when going out of scope
	onUnmounted(() => {
		docReleasers.forEach((release) => release());
		docReleasers.clear();
	});

	watch(userIds, (requestedIds) => {
		const requestedIdsSet = new Set(requestedIds);
		const currentIds = Object.keys(publicUserData);
		const currentIdsSet = new Set(currentIds);

		// All users in the userIds list which we haven't loaded
		const newUsers = requestedIds.filter((userId) => !currentIdsSet.has(userId));
		newUsers.forEach((userId) => {
			// Get their live public data and set it
			const userPublicRef = doc(db, "users", userId, "public", "data") as DocumentReference<PublicUserData>;
			const liveDoc = useLiveDoc(userPublicRef, (nw) => onError?.(nw, userId));
			publicUserData[userId] = liveDoc.data;
			docReleasers.set(userId, liveDoc.release);
		});

		// All users we have loaded which are not in the userIds list
		const removedUsers = currentIds.filter((userId) => !requestedIdsSet.has(userId));
		removedUsers.forEach((userId) => {
			// Remove them from the list and unsubscribe to live updates
			delete publicUserData[userId];
			docReleasers.get(userId)?.();
			docReleasers.delete(userId);
		});
	});

	return publicUserData;
}
