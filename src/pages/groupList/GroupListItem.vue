<script setup lang="ts">
import AvatarStack from "@/components/AvatarStack.vue";
import BalanceStrBadge from "@/components/BalanceStrBadge.vue";
import NavCard from "@/components/NavCard.vue";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { GroupListDataWithUserPublic } from "@/composables/useLiveGroupListWithUserPublic";
import { getBalanceStr } from "@/util/currency";
import { getLastUpdatedStr } from "@/util/time";
import { computed } from "vue";

const props = defineProps<{
	groupId: string;
	group: GroupListDataWithUserPublic;
}>();

const lastUpdatedStr = computed(() => getLastUpdatedStr(props.group.group.lastUpdate.seconds));

const yourBalanceStr = computed(() => {
	return getBalanceStr(
		props.group.myBalance,
		(b) => `You're owed ${b}`,
		(b) => `You owe ${b}`,
		() => "All Setil'd",
		props.group.group.currency,
	);
});
</script>

<template>
	<NavCard :to="`/group/${groupId}`" class="h-full">
		<CardHeader class="pr-12">
			<CardTitle class="truncate">{{ group.group.name }}</CardTitle>
			<CardDescription v-if="group.group.description" class="line-clamp-3">
				{{ group.group.description }}
			</CardDescription>
		</CardHeader>
		<CardContent class="mt-auto">
			<div class="flex justify-between items-end gap-2">
				<div class="flex flex-col gap-2">
					<BalanceStrBadge :balance-str="yourBalanceStr" />
					<span class="text-sm text-muted-foreground truncate">{{ lastUpdatedStr }}</span>
				</div>
				<AvatarStack
					avatar-class="border border-background"
					:avatars="
						group.topUsers
							.filter(([, topUserData]) => topUserData.computed.name)
							.map(([, topUserData]) => ({
								src: topUserData.public?.photoUrl ?? null,
								name: topUserData.computed.name!,
							}))
					"
					:total-count="group.userCount"
				/>
			</div>
		</CardContent>
	</NavCard>
</template>
