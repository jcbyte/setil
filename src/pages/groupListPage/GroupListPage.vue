<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import YourAccountSettings from "@/components/YourAccountSettings.vue";
import useLiveGroupListWithUserPublic, {
	type GroupListDataWithUserPublic,
} from "@/composables/useLiveGroupListWithUserPublic";
import { Plus } from "lucide-vue-next";
import { computed } from "vue";
import { useRouter } from "vue-router";
import GroupListItem from "./GroupListItem.vue";

const router = useRouter();

const { groupList, loaded: groupListLoaded } = useLiveGroupListWithUserPublic();

const sortedGroups = computed(() =>
	(
		Object.entries(groupList.value).filter(([, group]) => group !== null) as [string, GroupListDataWithUserPublic][]
	).sort(([, groupA], [, groupB]) => {
		return groupB.group.lastUpdate.seconds - groupA.group.lastUpdate.seconds;
	}),
);
</script>

<template>
	<div class="w-full flex flex-col gap-4">
		<div class="flex justify-between">
			<span class="text-lg font-semibold">My Groups</span>
			<div class="flex gap-2 justify-center items-center">
				<YourAccountSettings />

				<Button @click="router.push('/create')">
					<Plus :stroke-width="3" />
					<span class="font-semibold">New Group</span>
				</Button>
			</div>
		</div>

		<div class="flex justify-center items-center">
			<div
				v-if="!groupListLoaded || Object.keys(groupList).length > 0"
				class="flex flex-wrap gap-4 justify-center w-full"
			>
				<GroupListItem
					v-if="groupListLoaded && Object.keys(sortedGroups).length > 0"
					v-for="[groupId, group] in sortedGroups"
					:group="group"
					@click="router.push(`/group/${groupId}`)"
					class="max-w-[26rem] w-full"
				/>
				<Skeleton v-else v-for="_n in 3" class="rounded-lg h-[158px] max-w-[26rem] w-full" />
			</div>
			<div v-else class="flex flex-col justify-center items-center gap-2 pt-12">
				<span className="text-xl font-semibold">No groups yet</span>
				<span className="text-muted-foreground mb-6"> Create or join a group to start splitting expenses </span>
			</div>
		</div>
	</div>
</template>
