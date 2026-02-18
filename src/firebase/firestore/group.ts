import type { User } from "firebase/auth";
import {
	addDoc,
	arrayUnion,
	collection,
	deleteDoc,
	deleteField,
	doc,
	DocumentReference,
	getDoc,
	getDocs,
	limit,
	query,
	setDoc,
	Timestamp,
	updateDoc,
	where,
	writeBatch,
	WriteBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import type { GroupData, GroupUserData, Invite } from "../types";
import { getLeftUserStatus } from "./user";
import { getUser } from "./util";

const templateNewUser = (user: User): GroupUserData => ({
	nickname: user.displayName ?? "Unknown User",
	status: "active",
	balance: 0,
	lastUpdate: Timestamp.now(),
});

/**
 * Update the lastUpdated property of this user and the group.
 * @param groupRef Document of the group to update lastUpdate on.
 * @param batch WriteBatch to add the transactions to.
 */
export function updateGroupUpdateTime(groupRef: DocumentReference, batch: WriteBatch) {
	// Update the time when the current user has last added a transaction
	const user = getUser();
	const thisUserRef = doc(groupRef, "users", user.uid);
	batch.update(thisUserRef, { lastUpdate: Timestamp.now() });

	// Update the last update field for the group
	batch.update(groupRef, { lastUpdate: Timestamp.now() });
}

/**
 * Create a new group and add the user to it.
 * @param groupData the data for the new group.
 * @returns the id of the new group.
 */
export async function createGroup(groupData: Omit<GroupData, "owner">): Promise<string> {
	const user = getUser();

	// Create the group
	const groupsRef = collection(db, "groups");
	const groupRef = await addDoc(groupsRef, { ...groupData, owner: user.uid });

	// Add the user to the group
	const groupUsersRef = doc(groupRef, "users", user.uid);
	await setDoc(groupUsersRef, templateNewUser(user));

	// Add the group to the user
	const userRef = doc(db, "users", user.uid);
	await updateDoc(userRef, {
		groups: arrayUnion(groupRef.id),
	});

	return groupRef.id;
}

/**
 * Update a group with new data.
 * @param groupId id of the group.
 * @param groupData the parts of the group to update.
 */
export async function updateGroup(groupId: string, groupData: Partial<Omit<GroupData, "owner">>): Promise<void> {
	// Update the group
	const groupRef = doc(db, "groups", groupId);

	try {
		await updateDoc(groupRef, groupData);
	} catch (e) {
		throw `Could not update group: ${e}`;
	}
}

/**
 * Deletes the group.
 * @param groupId id of the group.
 */
export async function deleteGroup(groupId: string) {
	// Delete the group
	// The group will be removed from other users groups when they call `getUserGroups`
	const groupRef = doc(db, "groups", groupId);

	try {
		await deleteDoc(groupRef);
	} catch (e) {
		throw `Could not delete group: ${e}`;
	}
}

/**
 * Create an invite to the group which will automatically expire.
 * @param groupId id of the group.
 * @param expiry amount of time in ms when the invite will expire.
 * @returns the invite code.
 */
export async function invite(groupId: string, expiry: number): Promise<string> {
	const groupInvitesRef = collection(db, "groups", groupId, "invites");

	// Calculate the expiry date
	const inviteData: Invite = {
		expiry: Timestamp.fromMillis(Date.now() + expiry),
	};

	try {
		const inviteRef = await addDoc(groupInvitesRef, inviteData);
		return inviteRef.id;
	} catch (e) {
		throw `Could not create invite link: ${e}`;
	}
}

/**
 * Cleans up expired invites in a group.
 * @param groupId id of the group.
 */
export async function cleanupInvites(groupId: string): Promise<void> {
	// Find all expired invites
	const now = Timestamp.now();
	const groupInvitesRef = collection(db, "groups", groupId, "invites");
	const expiredInvitesQuery = query(groupInvitesRef, where("expiry", "<", now));
	const expiredInvitesSnap = await getDocs(expiredInvitesQuery);

	// Delete each of these
	const batch: WriteBatch = writeBatch(db);
	expiredInvitesSnap.forEach((doc) => batch.delete(doc.ref));
	await batch.commit();
}

/**
 * Try and join a group with an invite code.
 * @param groupId id of the group.
 * @param inviteCode invite code to join the group.
 * @param getData also retries the group and this user in the groups data.
 * @returns true if the user has newly joined the group.
 */
export async function joinGroup<T extends boolean>(
	groupId: string,
	inviteCode: string,
	getData: T = false as T,
): Promise<{ new: boolean } & (T extends true ? { user: GroupUserData; group: GroupData } : {})> {
	const user = getUser();
	const groupRef = doc(db, "groups", groupId);

	async function getGroupData(): Promise<GroupData> {
		const groupSnap = await getDoc(groupRef);
		return groupSnap.data() as GroupData;
	}

	// Add the group to the user if it is not already there
	const userRef = doc(db, "users", user.uid);
	await updateDoc(userRef, {
		groups: arrayUnion(groupId),
	});

	// Add ourselves to the group
	const groupUserRef = doc(groupRef, "users", user.uid);

	// Check if the user had previously been part of the group
	try {
		const userSnap = await getDoc(groupUserRef);
		if (userSnap.exists()) {
			// Set ourselves to active in the group if we had previously been part of it
			const userGroupData = userSnap.data() as GroupUserData;
			if (userGroupData.status !== "active") {
				updateDoc(groupUserRef, { status: "active" });

				// Return that we newly joined the group as we we had previously left
				return { new: true, ...(getData && { user: userGroupData, group: await getGroupData() }) };
			}

			// Return that the user was already in the group
			return { new: false, ...(getData && { user: userGroupData, group: await getGroupData() }) };
		}
	} catch {
		// If user does not haver permissions to check the group, hence they are and have never been in it.
	}

	// Join the group
	const newUserData = templateNewUser(user);
	try {
		await setDoc(groupUserRef, { ...newUserData, customData: { inviteCode } });

		// Remove the custom data, required to add a doc into the group
		await updateDoc(groupUserRef, { customData: deleteField() });
	} catch {
		// If joined failed then throw
		throw Error("Invalid code");
	}

	// Return that the user has joined the group
	return { new: true, ...(getData && { user: newUserData, group: await getGroupData() }) };
}

/**
 * Remove a user from a group.
 * @param groupId id of the group.
 * @param userId id of the user to remove.
 */
export async function removeUser(groupId: string, userId: string) {
	const groupUserRef = doc(db, "groups", groupId, "users", userId);

	// Get the status of the user when not in the group
	const status = await getLeftUserStatus(groupUserRef, true);

	// If the status needs to be changed then do this
	if (status) await updateDoc(groupUserRef, { status: status });
}

/**
 * Change a users nickname within a group.
 * @param groupId id of the group.
 * @param userId id of the user to update name.
 * @param nickname new name to give to the user.
 */
export async function changeUserNickname(groupId: string, userId: string, nickname: string) {
	const groupUserRef = doc(db, "groups", groupId, "users", userId);

	// Update the name of the user in the group
	await updateDoc(groupUserRef, { nickname });
}

/**
 * Set a groups owner to a different user.
 * @param groupId id of the group.
 * @param userId id of the user to promote.
 */
export async function promoteUser(groupId: string, userId: string) {
	const groupRef = doc(db, "groups", groupId);

	// Update the owner of the the group
	await updateDoc(groupRef, { owner: userId });
}

/**
 * User leaves the group, passing on ownership if required.
 * @param groupId id of the group.
 */
export async function leaveGroup(groupId: string) {
	const user = getUser();

	// If user is owner then pass this to a different user
	const groupRef = doc(db, "groups", groupId);
	const groupDocSnap = await getDoc(groupRef);
	const groupData = groupDocSnap.data() as GroupData;

	if (groupData.owner === user.uid) {
		// Find an active owner
		const firestoreUsersRef = collection(db, "groups", groupId, "users");
		const activeUserQuery = query(firestoreUsersRef, where("status", "==", "active"), limit(2));
		const userSnaps = await getDocs(activeUserQuery);

		// Exclude ourselves if we are found as the next possible owner
		const possibleOwners = userSnaps.docs.filter((doc) => doc.id !== user.uid).map((doc) => doc.id);

		if (possibleOwners.length === 0) {
			// Delete the group if the are no active users left
			await deleteGroup(groupId);
		} else {
			// Set the owner to the new owner found
			await updateDoc(groupRef, { owner: possibleOwners[0] });
		}
	}

	// Set the users status to show they have left
	const groupUserRef = doc(db, "groups", groupId, "users", user.uid);
	const newStatus = await getLeftUserStatus(groupUserRef, true);
	if (newStatus) await updateDoc(groupUserRef, { status: newStatus });
}
