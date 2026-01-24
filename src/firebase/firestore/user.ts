import type { PaymentDetails } from "@/util/paymentDetails";
import {
	arrayRemove,
	arrayUnion,
	collection,
	CollectionReference,
	doc,
	DocumentReference,
	getCountFromServer,
	getDoc,
	getDocs,
	getFirestore,
	limit,
	orderBy,
	query,
	setDoc,
	updateDoc,
	where,
	WriteBatch,
} from "firebase/firestore";
import { app } from "../firebase";
import type { GroupData, GroupUserData, UserData } from "../types";
import { getUser } from "./util";

const db = getFirestore(app);

/**
 * Initialise the users data area if is does not exist.
 * @returns true if the data was initialised.
 */
export async function initialiseUserData(): Promise<boolean> {
	const user = getUser();

	const userRef = doc(db, "users", user.uid);
	const userDocSnap = await getDoc(userRef);

	// Do nothing if the user already exists
	if (userDocSnap.exists()) return false;

	// Create the users data area
	await setDoc(userRef, { groups: [], fcmTokens: [] } as UserData);
	return true;
}

export interface ExtendedGroupData extends GroupData {
	topUsers: GroupUserData[];
	userCount: number;
	myself: GroupUserData;
}

/**
 * Get a list of the user's groups, including their extended data.
 * @param removeUnknownGroups if true, groups that the user does not have access to or have been deleted will be removed from the user.
 * @returns a list of the user's groups, including there data.
 * @throws an error if the user does not exist.
 */
export async function getUserGroups(removeUnknownGroups: boolean = true): Promise<Record<string, ExtendedGroupData>> {
	const user = getUser();

	const userRef = doc(db, "users", user.uid);
	const userDocSnap = await getDoc(userRef);

	// Throw if the user data has not been initialised
	if (!userDocSnap.exists()) throw new Error("User data does not exist");

	const userData = userDocSnap.data() as UserData;
	let unknownGroups: string[] = [];

	// Get the data for each group
	const userGroups = Object.fromEntries(
		(
			await Promise.all(
				userData.groups.map(async (id) => {
					const groupRef = doc(db, "groups", id);
					// If this throws, most likely the user does not have permission to access the group
					const groupDocSnap = await getDoc(groupRef).catch(() => null);

					// If the group does not exist, add it to the unknown groups list to be removed later
					if (!groupDocSnap || !groupDocSnap.exists()) {
						unknownGroups.push(id);
						return null;
					}

					const baseGroupData = groupDocSnap.data() as GroupData;

					// Get the extended group data
					const groupUsersRef = collection(groupRef, "users");

					const myselfSnap = await getDoc(doc(groupUsersRef, user.uid));
					const myselfData = myselfSnap.data() as GroupUserData;

					// If we have left or been removed from this group then, add it to the groups to be removed
					if (myselfData.status !== "active") {
						unknownGroups.push(id);
						return null;
					}

					// Get the last 3 active users to display
					const activeUsersQuery = query(groupUsersRef, where("status", "==", "active"));
					const usersCount = await getCountFromServer(activeUsersQuery);
					const topUsersQuery = query(activeUsersQuery, orderBy("lastUpdate"), limit(3));
					const topUsersSnap = await getDocs(topUsersQuery);

					const data: ExtendedGroupData = {
						...baseGroupData,
						topUsers: topUsersSnap.docs.map((topUserSnap) => topUserSnap.data() as GroupUserData),
						userCount: usersCount.data().count,
						myself: myselfData,
					};

					return [id, data];
				})
			)
		)
			// Filter out null values
			.filter((group) => group !== null)
	);

	// Remove unknown groups from the user's data if required
	if (removeUnknownGroups && unknownGroups.length > 0) {
		updateDoc(userRef, {
			groups: arrayRemove(...unknownGroups),
		});
	}

	return userGroups;
}

/**
 * Works out if the user has left the group with credit/debt or they are history.
 * @param userBalance balance of the user to test.
 * @param forceLeft force the user to leave irrespective of what there current status is.
 * @returns the status of the user given they have left the group, null if it doesn't require a change.
 */
export async function getLeftUserStatus(
	groupUserRef: DocumentReference,
	forceLeft: boolean
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
	leftUsers: string[]
) {
	await Promise.all(
		leftUsers.map(async (userId) => {
			const leftUserRef = doc(groupUsersRef, userId);

			// Check if there status is correct
			const newStatus = await getLeftUserStatus(leftUserRef, false);

			// If the status needs to be changed add this update
			if (newStatus) batch.update(leftUserRef, { status: newStatus });
		})
	);
}

/**
 * Add a fcm token to our users, so the server knows which devices to send push notifications too.
 * @param fcmToken the fcm token for our device given by firestore cloud messaging.
 */
export async function addFwcToken(fcmToken: string): Promise<void> {
	const user = getUser();

	// Add the fcw token to the user if it is not already there
	const userRef = doc(db, "users", user.uid);
	await updateDoc(userRef, {
		fcmTokens: arrayUnion(fcmToken),
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

	const res = await fetch(`/api/get-payment-details?${queryParams.toString()}`, {
		method: "GET",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${await user.getIdToken()}`,
		},
	}).then((res) => res.json());

	// If the response is incorrect return that no details have been set
	try {
		const details = JSON.parse(res.paymentDetails) as PaymentDetails | null;
		return details;
	} catch {
		return null;
	}
}

/**
 * Set our own payment details (or clear them).
 * @param details the payment details to set.
 * @returns true if it was successful.
 */
export async function setPaymentDetails(details: PaymentDetails | null): Promise<boolean> {
	const user = getUser();

	const res = await fetch("/api/set-payment-details", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${await user.getIdToken()}`,
		},
		body: JSON.stringify({ paymentDetails: JSON.stringify(details) }),
	}).then((res) => res.json());

	return res.success;
}
