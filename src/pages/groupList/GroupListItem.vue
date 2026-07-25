<script setup lang="ts">
import AvatarStack from "@/components/AvatarStack.vue";
import BalanceStrBadge from "@/components/BalanceStrBadge.vue";
import NavCard from "@/components/NavCard.vue";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { GroupListDataWithUserPublic } from "@/composables/useLiveGroupListWithUserPublic";
import { getBalanceStr } from "@/util/currency";
import { getLastUpdatedStr } from "@/util/time";
import { ChevronRight } from "@lucide/vue";
import { computed } from "vue";

const props = defineProps<{
	groupId: string;
	group: GroupListDataWithUserPublic;
}>();

const lastUpdatedStr = computed(() => getLastUpdatedStr(props.group.group.lastUpdate.seconds));

const yourBalanceStr = computed(() => {
	return getBalanceStr(
		props.group.myBalance,
		props.group.group.currency,
		(b) => `You're owed ${b}`,
		(b) => `You owe ${b}`,
		() => "All Setil'd",
	);
});
</script>

<template>
	<NavCard :to="`/group/${groupId}`">
		<CardHeader class="pr-12">
			<CardTitle>{{ group.group.name }}</CardTitle>
			<CardDescription v-if="group.group.description">{{ group.group.description }}</CardDescription>
		</CardHeader>
		<CardContent class="mt-auto">
			<div class="flex justify-between items-end gap-2">
				<div class="flex flex-col gap-2">
					<BalanceStrBadge :balance-str="yourBalanceStr" />
					<span class="text-sm text-muted-foreground">{{ lastUpdatedStr }}</span>
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
		<ChevronRight
			class="absolute right-5 top-5 size-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-foreground"
		/>
	</NavCard>
</template>
