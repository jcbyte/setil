<script setup lang="ts">
import Avatar from "@/components/Avatar.vue";
import BalanceStrBadge, { type BalanceStr } from "@/components/BalanceStrBadge.vue";
import type { GroupWithUserPublic } from "@/composables/useLiveGroupWithUserPublic";
import { getBalanceStr } from "@/util/currency";
import { computed } from "vue";

const props = defineProps<{
	group: GroupWithUserPublic;
}>();

const usersBalanceStr = computed<Record<string, BalanceStr>>(() => {
	return Object.fromEntries(
		Object.entries(props.group.users).map(([userId, user]) => [
			userId,
			getBalanceStr(
				user.balance,
				props.group.data.currency,
				(b) => `is owed ${b}`,
				(b) => `owes ${b}`,
				() => "is in balance",
			),
		]),
	);
});
</script>

<template>
	<div class="flex flex-col gap-2 border border-border rounded-lg p-4">
		<div class="flex flex-col">
			<span class="text-lg font-semibold">Balances</span>
			<span class="text-sm text-muted-foreground">Who owes what in this group</span>
		</div>
		<div class="flex flex-col gap-2">
			<div
				v-if="group.users"
				v-for="(user, userId) in Object.fromEntries(
					Object.entries(group.users).filter(([, user]) => user.status !== 'history'),
				)"
				class="flex justify-between items-center"
			>
				<div class="flex justify-center items-center gap-1">
					<Avatar
						:src="user.public?.photoUrl ?? null"
						:name="user.nickname"
						:class="`size-9 ${user.status !== 'active' && 'opacity-70'}`"
					/>
					<span :class="`${user.status !== 'active' && 'text-muted-foreground'}`">{{ user.nickname }}</span>
					<span v-if="user.status !== 'active'" class="text-xs place-self-end text-muted-foreground italic">
						(Left)
					</span>
				</div>
				<BalanceStrBadge :balance-str="usersBalanceStr[userId]" />
			</div>
		</div>
	</div>
</template>
