import type { GroupUserData, PublicUserData } from "@/firebase/types";
import { computed, type Ref } from "vue";
import { useLiveGroup, type Group } from "./useLiveGroup";
import useUserCollection from "./useUserCollection";

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
	const userPublic = useUserCollection(userIds, onError);

	const liveGroupWithUserPublic = computed(() => {
		if (!liveGroup.value) return null;

		const mergedUserData = Object.fromEntries(
			Object.entries(liveGroup.value.users).map(([userId, groupUserData]) => [
				userId,
				{ ...groupUserData, public: userPublic.value[userId].value },
			]),
		);

		return { ...liveGroup.value, users: mergedUserData };
	});

	return liveGroupWithUserPublic;
}
