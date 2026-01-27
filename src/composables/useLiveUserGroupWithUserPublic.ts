import type { GroupUserData, PublicUserData } from "@/firebase/types";
import { computed, unref, type Ref } from "vue";
import { useLiveGroup, type Group } from "./useLiveGroup";
import useLiveUserCollection from "./useLiveUserCollection";

export type GroupUserDataWithPublic = GroupUserData & { public: PublicUserData | null };
export type GroupWithUserPublic = Omit<Group, "users"> & {
	users: Record<string, GroupUserDataWithPublic>;
};

export default function useLiveGroupWithUserPublic(
	groupId: string | null,
	onError?: (userId?: string) => void,
): Ref<GroupWithUserPublic | null> {
	const liveGroup = useLiveGroup(groupId, onError);

	const userIds = computed(() => (liveGroup.value ? Object.keys(liveGroup.value.users) : []));
	const userPublic = useLiveUserCollection(userIds, onError);

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
