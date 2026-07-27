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
	<div class="mx-auto w-full max-w-4xl flex flex-col gap-4">
		<div class="flex justify-between items-center">
			<span class="text-lg font-semibold">My Groups</span>
			<div class="flex gap-2 justify-center items-center">
				<YourAccountSettings />

				<RouterLink to="/create">
					<Button type="button">
						<Plus :stroke-width="3" />
						<span class="font-semibold">New Group</span>
					</Button>
				</RouterLink>
			</div>
		</div>

		<div class="grid w-full grid-cols-[repeat(auto-fit,minmax(min(100%,24rem),1fr))] gap-4">
			<Skeleton v-if="!groupListLoaded" v-for="_n in 4" class="rounded-lg h-42 w-full" />

			<template v-else-if="Object.keys(groupList).length > 0" v-for="[groupId, group] in sortedGroups">
				<GroupListItem v-if="group" :group-id="groupId" :group="group" />
				<Skeleton v-else class="rounded-lg h-42 w-full" />
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
					<RouterLink to="/create">
						<Button type="button">New Group</Button>
					</RouterLink>
				</EmptyContent>
			</Empty>
		</div>
	</div>
</template>
