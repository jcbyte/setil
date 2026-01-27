import { db } from "@/firebase/firebase";
import { removeGroupFromUser } from "@/firebase/firestore/user";
import type { GroupData, GroupUserData, UserData } from "@/firebase/types";
import { collection, CollectionReference, doc, DocumentReference, query, where } from "firebase/firestore";
import { computed, onUnmounted, reactive, ref, watch, type Ref } from "vue";
import { useCurrentUser } from "./useCurrentUser";
import { useLiveDoc } from "./useLiveDoc";
import { useLiveQuery } from "./useLiveQuery";

export type GroupListData = {
	group: GroupData;
	userCount: number;
	topUsers: [string, GroupUserData][];
	myBalance: number;
};

/**
 * Composable for subscribing to the current user's list of groups.
 *
 * Dynamically manages subscriptions to each group the user is a member of. Each
 * group includes aggregated data: member count, top 3 recent members, and user's balance.
 *
 * Automatically removes groups from the user's account if they can't be accessed (permission/not-found).
 *
 * @param {Function} [onError] - Optional callback for error handling. Called with:
 *   - network: boolean - true if error is network related, false if access related
 *   - groupId: string - the id of the group where the error occurred or undefined if it occurred getting the users group list
 * @returns {Object} Object containing:
 *   - groupList: Reactive Record mapping group ids to reactive group data
 *   - loaded: Reactive boolean indicating whether the user's group list has loaded
 */
export default function useLiveGroupList(onError?: (network: boolean, groupId?: string) => void): {
	groupList: Record<string, Ref<GroupListData | null>>;
	loaded: Ref<boolean>;
} {
	const currentUser = useCurrentUser();

	const userRef = doc(db, "users", currentUser.value!.uid) as DocumentReference<UserData>;
	const { data: userData, release: releaseUserData } = useLiveDoc(userRef, (nw) => onError?.(nw));

	const groupList = reactive<Record<string, Ref<GroupListData | null>>>({});
	const loaded = ref<boolean>(false);
	const docReleasers = new Map<string, () => void>();

	// Automatically cleanup the live subscribers when going out of scope
	onUnmounted(() => {
		releaseUserData();
		docReleasers.forEach((release) => release());
		docReleasers.clear();
	});

	watch(
		userData,
		(newUserData) => {
			if (!newUserData) return;

			const requestedGroups = newUserData.groups;
			const requestedGroupsSet = new Set(requestedGroups);
			const currentGroups = Object.keys(groupList);
			const currentGroupsSet = new Set(currentGroups);

			// All groups in the users group list which we haven't loaded
			const newGroups = requestedGroups.filter((groupId) => !currentGroupsSet.has(groupId));
			newGroups.forEach((groupId) => {
				// Get the live group data
				const groupRef = doc(db, "groups", groupId) as DocumentReference<GroupData>;
				const { data: groupData, release: releaseGroupData } = useLiveDoc(groupRef, (nw) => {
					if (nw) return onError?.(nw, groupId);
					// If the group cannot be accessed remove from the users account
					// This should be due to being removed or deleted.
					removeGroupFromUser(groupId);
				});
				// Get the live active users for the group though a query
				const groupUsersRef = collection(groupRef, "users") as CollectionReference<GroupUserData>;
				const activeUsersQuery = query(groupUsersRef, where("status", "==", "active"));
				const {
					items: groupActiveUsers,
					loaded: groupActiveUsersLoaded,
					release: releaseGroupActiveUsers,
				} = useLiveQuery(activeUsersQuery, (nw) => onError?.(nw, groupId));

				const groupListData = computed(() => {
					if (!groupData.value) return null;
					if (!groupActiveUsersLoaded) return null;

					// Compute user count
					const userCount = Object.keys(groupActiveUsers).length;
					// Compute last 3 users to perform updates
					const topUsers = Object.entries(groupActiveUsers)
						.sort(([, userA], [, userB]) => userB.lastUpdate.toMillis() - userA.lastUpdate.toMillis())
						.slice(0, 3);
					// Compute our users balance in the group
					const myBalance = groupActiveUsers[currentUser.value!.uid]?.balance ?? null;

					return { group: groupData.value, userCount, topUsers, myBalance };
				});

				// Set group with computed properties
				groupList[groupId] = groupListData;
				docReleasers.set(groupId, () => {
					releaseGroupData();
					releaseGroupActiveUsers();
				});
			});

			// All groups we have loaded which are not in the users group list
			const removedGroups = currentGroups.filter((groupId) => !requestedGroupsSet.has(groupId));
			removedGroups.forEach((groupId) => {
				// Remove them from the list and unsubscribe to live updates
				delete groupList[groupId];
				docReleasers.get(groupId)?.();
				docReleasers.delete(groupId);
			});

			loaded.value = true;
		},
		{ immediate: true },
	);

	return { groupList, loaded };
}
