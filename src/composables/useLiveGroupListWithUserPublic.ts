import type { GroupUserData, PublicUserData } from "@/firebase/types";
import { computed, unref, type Ref } from "vue";
import type { GroupListData } from "./useLiveGroupList";
import useLiveGroupList from "./useLiveGroupList";
import useLiveUserCollection from "./useLiveUserCollection";

export type GroupUserDataWithPublic = GroupUserData & { public: PublicUserData | null };
export type GroupListDataWithUserPublic = Omit<GroupListData, "topUsers"> & {
	topUsers: [string, GroupUserDataWithPublic][];
};

export default function useLiveGroupListWithUserPublic(
	onError?: (userId?: string) => void,
): Ref<Record<string, GroupListDataWithUserPublic | null>> {
	const liveGroupList = useLiveGroupList(onError);

	const userIds = computed(() => [
		...new Set(
			Object.values(liveGroupList).flatMap((groupRef) => {
				const group = unref(groupRef);
				if (!group) return [];
				return group.topUsers.map(([userId]) => userId);
			}),
		),
	]);
	const userPublic = useLiveUserCollection(userIds, onError);

	const liveGroupListWithUserPublic = computed(() =>
		Object.fromEntries(
			Object.entries(liveGroupList).map(([groupId, groupRef]) => {
				const group = unref(groupRef);
				if (!group) return [groupId, group];

				const mergedUsers: [string, GroupUserDataWithPublic][] = group.topUsers.map(([userId, userData]) => {
					const publicRef = userPublic[userId];
					return [userId, { ...userData, public: unref(publicRef) }];
				});

				return [groupId, { ...group, topUsers: mergedUsers }];
			}),
		),
	);

	return liveGroupListWithUserPublic;
}
