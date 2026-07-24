<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import YourAccountSettings from "@/components/YourAccountSettings.vue";
import useLiveGroupListWithUserPublic from "@/composables/useLiveGroupListWithUserPublic";
import { Plus, UsersRound } from "@lucide/vue";
import { computed } from "vue";
import { useRouter } from "vue-router";
import GroupListItem from "./GroupListItem.vue";

const router = useRouter();

const { groupList, loaded: groupListLoaded } = useLiveGroupListWithUserPublic();

const sortedGroups = computed(() =>
	Object.entries(groupList.value).sort(([, groupA], [, groupB]) => {
		if (!groupA && !groupB) return 0;
		if (!groupA) return 1;
		if (!groupB) return -1;

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

		<div class="flex flex-wrap gap-4 justify-center w-full">
			<Skeleton v-if="!groupListLoaded" v-for="_n in 3" class="rounded-lg h-[158px] max-w-[26rem] w-full" />

			<template v-else-if="Object.keys(groupList).length > 0" v-for="[groupId, group] in sortedGroups">
				<GroupListItem
					v-if="group"
					:group="group"
					@click="router.push(`/group/${groupId}`)"
					class="max-w-[26rem] w-full"
				/>
				<Skeleton v-else class="rounded-lg h-[158px] max-w-[26rem] w-full" />
			</template>

			<Empty v-else>
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<UsersRound />
					</EmptyMedia>
					<EmptyTitle>No Groups</EmptyTitle>
					<EmptyDescription>Create or join a group to start splitting expenses</EmptyDescription>
				</EmptyHeader>
				<EmptyContent>
					<Button @click="router.push('/create')">New Group</Button>
				</EmptyContent>
			</Empty>
		</div>
	</div>
</template>
