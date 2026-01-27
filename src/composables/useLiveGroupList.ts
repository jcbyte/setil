import { db } from "@/firebase/firebase";
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

export default function useLiveGroupList(onError?: (network: boolean, groupId?: string) => void): {
	groupList: Record<string, Ref<GroupListData | null>>;
	loaded: Ref<boolean>;
} {
	const { currentUser } = useCurrentUser();

	// ! BANG in current user here and also below
	const userRef = doc(db, "users", currentUser.value!.uid) as DocumentReference<UserData>;
	const { data: userData, release: releaseUserData } = useLiveDoc(userRef, (nw) => onError?.(nw));

	const groupList = reactive<Record<string, Ref<GroupListData | null>>>({});
	const loaded = ref<boolean>(false);
	const docReleasers = new Map<string, () => void>();

	onUnmounted(() => {
		releaseUserData();
		docReleasers.forEach((release) => release());
		docReleasers.clear();
	});

	watch(
		userData,
		(newUserData) => {
			if (!newUserData) return;

			loaded.value = true;

			const requestedGroups = newUserData.groups;
			const requestedGroupsSet = new Set(requestedGroups);
			const currentGroups = Object.keys(groupList);
			const currentGroupsSet = new Set(currentGroups);

			const newGroups = requestedGroups.filter((groupId) => !currentGroupsSet.has(groupId));
			newGroups.forEach((groupId) => {
				const groupRef = doc(db, "groups", groupId) as DocumentReference<GroupData>;
				const { data: groupData, release: releaseGroupData } = useLiveDoc(groupRef, (nw) => {
					// todo this could fail which means that the group does not exist/user was removed, we should remove the group from the user in this case
				});
				const groupUsersRef = collection(groupRef, "users") as CollectionReference<GroupUserData>;
				const activeUsersQuery = query(groupUsersRef, where("status", "==", "active"));
				const { items: groupActiveUsers, release: releaseGroupActiveUsers } = useLiveQuery(activeUsersQuery, (nw) =>
					onError?.(nw, groupId),
				);

				const groupListData = computed(() => {
					if (!groupData.value) return null;
					if (!groupActiveUsers.value) return null;

					const userCount = Object.keys(groupActiveUsers.value).length;
					const topUsers = Object.entries(groupActiveUsers.value)
						.sort(([, userA], [, userB]) => userB.lastUpdate.toMillis() - userA.lastUpdate.toMillis())
						.slice(0, 3);
					const myBalance = groupActiveUsers.value[currentUser.value!.uid].balance;

					return { group: groupData.value, userCount, topUsers, myBalance };
				});

				groupList[groupId] = groupListData;
				docReleasers.set(groupId, () => {
					releaseGroupData();
					releaseGroupActiveUsers();
				});
			});

			const removedGroups = currentGroups.filter((groupId) => !requestedGroupsSet.has(groupId));
			removedGroups.forEach((groupId) => {
				delete groupList[groupId];
				docReleasers.get(groupId)?.();
				docReleasers.delete(groupId);
			});
		},
		{ immediate: true },
	);

	return { groupList, loaded };
}
