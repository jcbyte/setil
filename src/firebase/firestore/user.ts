import type { PaymentDetails } from "@/util/paymentDetails";
import {
	arrayRemove,
	arrayUnion,
	CollectionReference,
	doc,
	DocumentReference,
	getDoc,
	setDoc,
	updateDoc,
	writeBatch,
	WriteBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import type { GroupUserData, PublicUserData, UserData } from "../types";
import { getUser } from "./util";

/**
 * Initialise the users data area if is does not exist.
 * @returns true if the data was initialised.
 */
export async function initialiseUserData(): Promise<boolean> {
	const user = getUser();

	const userRef = doc(db, "users", user.uid) as DocumentReference<UserData>;
	const userDocSnap = await getDoc(userRef);

	// Do nothing if the user already exists
	if (userDocSnap.exists()) return false;

	// Create the users data area
	const userData: UserData = { groups: [], fids: [] };
	await setDoc(userRef, userData);

	const userPublicRef = doc(userRef, "public", "data") as DocumentReference<PublicUserData>;
	const publicUserData: PublicUserData = {
		name: user.displayName ?? "Unknown User",
		photoUrl: user.photoURL ?? undefined,
		hasBankDetails: false,
	};
	await setDoc(userPublicRef, publicUserData);

	return true;
}

export async function removeGroupFromUser(groupId: string) {
	const user = getUser();
	const userRef = doc(db, "users", user.uid) as DocumentReference<UserData>;

	updateDoc(userRef, { groups: arrayRemove(groupId) });
}

/**
 * Works out if the user has left the group with credit/debt or they are history.
 * @param userBalance balance of the user to test.
 * @param forceLeft force the user to leave irrespective of what there current status is.
 * @returns the status of the user given they have left the group, null if it doesn't require a change.
 */
export async function getLeftUserStatus(
	groupUserRef: DocumentReference,
	forceLeft: boolean,
): Promise<"left" | "history" | null> {
	const groupUserSnap = await getDoc(groupUserRef);
	const groupUser = groupUserSnap.data() as GroupUserData;

	// If the user is active then don't change
	if (!forceLeft && groupUser.status === "active") return null;

	// Check if there is any balance left on this user and calculate correct status
	const status = groupUser.balance === 0 ? "history" : "left";

	// Return new status if it is modified
	return groupUser.status === status ? null : status;
}

/**
 * Add firebase updates to a batch to update users who have left a group to their valid status.
 * @param groupUsersRef Collection to the users in the group.
 * @param batch WriteBatch to add the transactions to.
 * @param leftUsers Array of userId's which have left and status needs to be recalculated.
 */

export async function updateLeftUsersStatus(
	groupUsersRef: CollectionReference,
	batch: WriteBatch,
	leftUsers: string[],
) {
	await Promise.all(
		leftUsers.map(async (userId) => {
			const leftUserRef = doc(groupUsersRef, userId) as DocumentReference<GroupUserData>;

			// Check if there status is correct
			const newStatus = await getLeftUserStatus(leftUserRef, false);

			// If the status needs to be changed add this update
			if (newStatus) batch.update(leftUserRef, { status: newStatus });
		}),
	);
}

/**
 * Add a fid to our user, so the server knows which devices to send push notifications too.
 * @param fid the fid for our device given by firestore cloud messaging.
 */
export async function addFid(fid: string): Promise<void> {
	const user = getUser();

	// Add the fid to the user if it is not already there
	const userRef = doc(db, "users", user.uid) as DocumentReference<UserData>;
	await updateDoc(userRef, {
		fids: arrayUnion(fid),
	});
}

/**
 * Get the payment details of a user.
 * @param userId the userId of bank details to retrieve (if omitted will get ourselves).
 * @param groupId the shared groupId between us and the userId (not needed when getting ourselves).
 * @returns the payment details of the specified user.
 */
export async function getPaymentDetails(userId?: string, groupId?: string): Promise<PaymentDetails | null> {
	const user = getUser();

	const queryParams = new URLSearchParams({
		userId: userId ?? user.uid,
		...(groupId ? { groupId } : {}),
	});

	const res = await fetch(`/api/payment-details?${queryParams.toString()}`, {
		method: "GET",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${await user.getIdToken()}`,
		},
	}).then((res) => res.json());

	if (res.paymentDetails === null) return null;
	// If the response is incorrect return that no details have been set
	try {
		return JSON.parse(res.paymentDetails) as PaymentDetails;
	} catch {
		return null;
	}
}

/**
 * Set our own payment details.
 * @param details the payment details to set.
 * @returns true if it was successful.
 */
export async function setPaymentDetails(details: PaymentDetails | null): Promise<boolean> {
	const user = getUser();

	const res = await fetch("/api/payment-details", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${await user.getIdToken()}`,
		},
		body: JSON.stringify({ paymentDetails: details }),
	}).then((res) => res.json());

	return res.success;
}

/**
 * Clear our own payment details.
 * @returns true if it was successful.
 */
export async function removePaymentDetails(): Promise<boolean> {
	const user = getUser();

	const res = await fetch("/api/payment-details", {
		method: "DELETE",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${await user.getIdToken()}`,
		},
	}).then((res) => res.json());

	return res.success;
}

/**
 * Set our own global name, and update any non-changed nicknames.
 * @param name the name to set.
 */
export async function setName(name: string) {
	const user = getUser();
	const userRef = doc(db, "users", user.uid) as DocumentReference<UserData>;
	const userPublicRef = doc(userRef, "public", "data") as DocumentReference<PublicUserData>;

	const userPublicSnap = await getDoc(userPublicRef);
	const userPublicData = userPublicSnap.data();
	if (!userPublicData) throw Error(`User ${user.uid} does not have a '/public' doc`);
	const oldName = userPublicData.name;
	if (name === oldName) return;

	const userSnap = await getDoc(userRef);
	const userData = userSnap.data();
	if (!userData) throw Error(`User ${user.uid} does not exist`);
	const userGroups = userData.groups;

	const batch = writeBatch(db);
	batch.update(userPublicRef, { name });

	// Update all nicknames in groups where it has been unchanged
	const userGroupsSnaps = await Promise.all(
		userGroups.map((groupId) => {
			const groupUserRef = doc(db, "groups", groupId, "users", user.uid) as DocumentReference<GroupUserData>;
			return getDoc(groupUserRef);
		}),
	);

	userGroupsSnaps
		.filter((groupUserSnap) => groupUserSnap.exists())
		.forEach((groupUserSnap) => {
			const currentNickname = groupUserSnap.data().nickname;
			if (currentNickname === oldName) batch.update(groupUserSnap.ref, { nickname: name });
		});

	await batch.commit();

	// todo Would having nicknames optional be a better strategy, and fallback to public name
}

/**
 * Retrieve our saved user data from the database.
 * @returns the users public data.
 */
export async function getUserData(): Promise<{ public: PublicUserData }> {
	const user = getUser();
	const userPublicRef = doc(db, "users", user.uid, "public", "data") as DocumentReference<PublicUserData>;

	const userPublicSnap = await getDoc(userPublicRef);
	const userPublic = userPublicSnap.data();
	if (!userPublic) throw Error(`User ${user.uid} does not have a '/public' doc`);

	// ? If we have private data, this can also be returned here
	return { public: userPublic };
}
