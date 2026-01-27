<script setup lang="ts">
import AvatarStack from "@/components/AvatarStack.vue";
import BalanceStrBadge from "@/components/BalanceStrBadge.vue";
import type { GroupListDataWithUserPublic } from "@/composables/useLiveGroupListWithUserPublic";
import { getBalanceStr } from "@/util/currency";
import { Timestamp } from "firebase/firestore";
import { ChevronRight } from "lucide-vue-next";
import { computed } from "vue";

const props = defineProps<{
	group: GroupListDataWithUserPublic;
}>();

const lastUpdatedStr = computed(() => {
	const deltaTime = Timestamp.now().seconds - props.group.group.lastUpdate.seconds;

	const intervals: { label: string; seconds: number }[] = [
		{ label: "year", seconds: 31536000 },
		{ label: "month", seconds: 2592000 },
		{ label: "week", seconds: 604800 },
		{ label: "day", seconds: 86400 },
		{ label: "hour", seconds: 3600 },
		{ label: "minute", seconds: 60 },
	];

	const interval = intervals.find(({ seconds }) => Math.floor(deltaTime / seconds) >= 1);

	if (interval) {
		const count = Math.floor(deltaTime / interval.seconds);
		return `Updated ${count} ${interval.label}${count > 1 ? "s" : ""} ago`;
	}

	return "Updated just now";
});

const yourBalanceStr = computed(() => {
	return getBalanceStr(
		props.group.myBalance,
		props.group.group.currency,
		(b) => `You're owed ${b}`,
		(b) => `You owe ${b}`,
		() => "Your all in balance",
	);
});
</script>

<template>
	<div class="flex flex-col justify-between gap-2 border border-border rounded-lg p-4 relative">
		<div class="flex flex-col gap-2">
			<div class="flex flex-col">
				<span class="text-lg font-semibold">{{ group.group.name }}</span>
				<span v-if="group.group.description" class="text-sm text-muted-foreground">{{ group.group.description }}</span>
			</div>
			<AvatarStack
				avatar-class="border border-background"
				:avatars="
					group.topUsers.map(([, topUserData]) => ({
						src: topUserData.public?.photoUrl ?? null,
						name: topUserData.nickname,
					}))
				"
				:total-count="group.userCount"
			/>
		</div>

		<div class="flex justify-between">
			<span class="text-sm text-muted-foreground">{{ lastUpdatedStr }}</span>
			<BalanceStrBadge :balance-str="yourBalanceStr" />
		</div>
		<ChevronRight class="text-muted-foreground absolute top-4 right-4" />
	</div>
</template>
