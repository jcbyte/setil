import type { GroupUserData, PublicUserData } from "@/firebase/types";
import { computed, unref, type Ref } from "vue";
import { useLiveGroup, type Group } from "./useLiveGroup";
import useLiveUserCollection from "./useLiveUserCollection";

export type GroupUserDataWithPublic = GroupUserData & { public: PublicUserData | null };
export type GroupWithUserPublic = Omit<Group, "users"> & {
	users: Record<string, GroupUserDataWithPublic>;
};

/**
 * Composable for subscribing to complete group with enriched user public profile data.
 *
 * Wraps `useLiveGroup` and automatically fetches public profile data for all members
 * of the group. Merges the public data into each user's group member record.
 *
 * @param {string | null} groupId - The static id of the group to subscribe to, or null
 * @param {Function} [onError] - Optional callback for error handling. Called with:
 *   - network: boolean - true if error is network related, false if access related
 *   - group: boolean - true if error is in group data, false if in user public data
 *   - id: string - the id of the affected group or user (optional)
 * @returns {Ref<GroupWithUserPublic | null>} Reactive ref containing the complete group
 *   with all members enriched with public profile data, or null if groupId is null
 *   or the group has not loaded yet
 */
export default function useLiveGroupWithUserPublic(
	groupId: string | null,
	onError?: (network: boolean, group: boolean, id?: string) => void,
): Ref<GroupWithUserPublic | null> {
	// Get live group data
	const liveGroup = useLiveGroup(groupId, (nw) => onError?.(nw, true));

	// Compute usersIds within the group, and retrieve there live public data
	const userIds = computed(() => (liveGroup.value ? Object.keys(liveGroup.value.users) : []));
	const userPublic = useLiveUserCollection(userIds, (nw, userId) => onError?.(nw, false, userId));

	// Merge public data into each user
	const liveGroupWithUserPublic = computed(() => {
		if (!liveGroup.value) return null;

		const mergedUserData: Record<string, GroupUserDataWithPublic> = Object.fromEntries(
			Object.entries(liveGroup.value.users).map(([userId, groupUserData]) => {
				const publicRef = userPublic[userId];
				return [
					userId,
					{
						...groupUserData,
						public: unref(publicRef),
					},
				];
			}),
		);

		return { ...liveGroup.value, users: mergedUserData };
	});

	return liveGroupWithUserPublic;
}
