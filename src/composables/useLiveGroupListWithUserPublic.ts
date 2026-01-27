import type { GroupUserData, PublicUserData } from "@/firebase/types";
import { computed, unref, type Ref } from "vue";
import type { GroupListData } from "./useLiveGroupList";
import useLiveGroupList from "./useLiveGroupList";
import useLiveUserCollection from "./useLiveUserCollection";

export type GroupUserDataWithPublic = GroupUserData & { public: PublicUserData | null };
export type GroupListDataWithUserPublic = Omit<GroupListData, "topUsers"> & {
	topUsers: [string, GroupUserDataWithPublic][];
};

/**
 * Composable for subscribing to the current user's group list with enriched user public data.
 *
 * Wraps useLiveGroupList and automatically fetches public profile data for all users
 * appearing in the top 3 members of each group. Merges the public data into the group list.
 *
 * @param {Function} [onError] - Optional callback for error handling. Called with:
 *   - network: boolean - true if error is network related, false if access related
 *   - group: boolean - true if error is in group data, false if in user public data
 *   - id: string - the id of the affected group or user (optional)
 * @returns {Object} Object containing:
 *   - groupList: Reactive Record mapping group ids to reactive group data enriched with public user data
 *   - loaded: Reactive boolean indicating whether the group list has loaded
 */
export default function useLiveGroupListWithUserPublic(
	onError?: (network: boolean, group: boolean, id?: string) => void,
): {
	groupList: Ref<Record<string, GroupListDataWithUserPublic | null>>;
	loaded: Ref<boolean>;
} {
	// Get live group list
	const { groupList, loaded } = useLiveGroupList((nw, groupId) => onError?.(nw, true, groupId));

	// Compute unique userIds within each group, and retrieve there live public data
	const userIds = computed(() => [
		...new Set(
			Object.values(groupList).flatMap((groupRef) => {
				const group = unref(groupRef);
				if (!group) return [];
				return group.topUsers.map(([userId]) => userId);
			}),
		),
	]);
	const userPublic = useLiveUserCollection(userIds, (nw, userId) => onError?.(nw, false, userId));

	// Create new merged users object for each group
	const liveGroupListWithUserPublic = computed(() =>
		Object.fromEntries(
			Object.entries(groupList).map(([groupId, groupRef]) => {
				const group = unref(groupRef);
				if (!group) return [groupId, group];

				// Merge public data into each user
				const mergedUsers: [string, GroupUserDataWithPublic][] = group.topUsers.map(([userId, userData]) => {
					const publicRef = userPublic[userId];
					return [userId, { ...userData, public: unref(publicRef) }];
				});

				return [groupId, { ...group, topUsers: mergedUsers }];
			}),
		),
	);

	return { groupList: liveGroupListWithUserPublic, loaded };
}
