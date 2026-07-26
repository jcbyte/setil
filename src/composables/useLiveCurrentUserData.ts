import { db } from "@/firebase/firebase";
import { getUser } from "@/firebase/firestore/util";
import type { PublicUserData, UserData } from "@/firebase/types";
import { doc, DocumentReference } from "firebase/firestore";
import { computed, onScopeDispose, type Ref } from "vue";
import { acquireLiveDoc } from "../firebase/live/acquireLiveDoc";

export interface CurrentUserData {
	user: UserData | null;
	public: PublicUserData | null;
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
export function useLiveCurrentUserData(onError?: (network: boolean) => void): Ref<CurrentUserData> {
	const user = getUser();

	// Get the live data for the user
	const userRef = doc(db, "users", user.uid) as DocumentReference<UserData>;
	const { data: liveUserData, release: releaseUserData } = acquireLiveDoc(userRef, onError);

	const userPublicRef = doc(db, "users", user.uid, "public", "data") as DocumentReference<PublicUserData>;
	const { data: livePublicData, release: releasePublicData } = acquireLiveDoc(userPublicRef, onError);

	// Automatically cleanup the live subscribers when going out of scope
	onScopeDispose(() => {
		releaseUserData();
		releasePublicData();
	});

	// Return null until the data has loaded
	const data = computed<CurrentUserData>(() => ({
		user: liveUserData.value,
		public: livePublicData.value,
	}));

	return data;
}
