import type { GroupUserData, PublicUserData } from "@/firebase/types";
import { computed, unref, type Ref } from "vue";
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

		const mergedUserData: Record<string, GroupUserDataWithPublic> = Object.fromEntries(
			Object.entries(liveGroup.value.users).map(([userId, groupUserData]) => [
				userId,
				{
					...groupUserData,
					public: null,
				},
			]),
		);

		Object.entries(userPublic.value).forEach(([userId, publicData]) => {
			// ? Unsure as why unref is needed here, potentially Vue does auto-unwrapping
			if (mergedUserData[userId]) mergedUserData[userId].public = unref(publicData);
		});

		return { ...liveGroup.value, users: mergedUserData };
	});

	return liveGroupWithUserPublic;
}
