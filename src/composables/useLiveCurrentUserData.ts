import { db } from "@/firebase/firebase";
import { getUser } from "@/firebase/firestore/util";
import type { PublicUserData } from "@/firebase/types";
import { doc, DocumentReference } from "firebase/firestore";
import { computed, onUnmounted, type Ref } from "vue";
import { useLiveDoc } from "./useLiveDoc";

export interface UserData {
	public: PublicUserData;
}

/**
 * Composable for subscribing to the related data of the current user.
 *
 * Fetches and syncs the relevant documents in a single reactive object.
 * Automatically handles cleanup of all subscriptions on component unmount.
 *
 * @param {Function} [onError] - Optional callback for error handling. Called with:
 *   - network: boolean - true if error is network related, false if access related
 * @returns {Ref<Group | null>} Reactive ref containing the complete user data, or null
 *   if the data has not loaded yet
 */
export function useLiveCurrentUserData(onError?: (network: boolean) => void): Ref<UserData | null> {
	const user = getUser();

	// Get the live data for the user
	const userPublicRef = doc(db, "users", user.uid, "public", "data") as DocumentReference<PublicUserData>;
	const { data: livePublicData, release: releasePublicData } = useLiveDoc(userPublicRef, onError);

	// Automatically cleanup the live subscribers when going out of scope
	onUnmounted(() => {
		releasePublicData();
	});

	// Return null until the data has loaded
	const data = computed<UserData | null>(() => {
		if (!livePublicData.value) return null;

		return {
			public: livePublicData.value,
		};
	});

	return data;
}
