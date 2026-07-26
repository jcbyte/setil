<script setup lang="ts">
import Avatar from "@/components/Avatar.vue";
import BalanceStrBadge, { type BalanceStr } from "@/components/BalanceStrBadge.vue";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { GroupWithUserPublic } from "@/composables/useLiveGroupWithUserPublic";
import { getBalanceStr } from "@/util/currency";
import { computed } from "vue";

const props = defineProps<{
	group: GroupWithUserPublic;
}>();

const usersBalanceStr = computed<Record<string, BalanceStr> | null>(() => {
	const currency = props.group.data?.currency;
	if (!props.group.users || !currency) return null;

	return Object.fromEntries(
		Object.entries(props.group.users).map(([userId, user]) => [
			userId,
			getBalanceStr(
				user.balance,
				(b) => `is owed ${b}`,
				(b) => `owes ${b}`,
				() => "is all Setil'd",
				currency,
			),
		]),
	);
});
</script>

<template>
	<Card>
		<CardHeader>
			<CardTitle>Balances</CardTitle>
			<CardDescription>Who owes what in this group</CardDescription>
		</CardHeader>
		<CardContent>
			<div class="flex flex-col gap-2">
				<div
					v-if="group.users"
					v-for="(user, userId) in Object.fromEntries(
						Object.entries(group.users).filter(([, user]) => user.status !== 'history'),
					)"
					class="flex justify-between items-center"
				>
					<div class="flex justify-center items-center gap-2">
						<Avatar
							v-if="user.computed.name"
							:src="user.public?.photoUrl ?? null"
							:name="user.computed.name"
							:class="`size-8 ${user.status !== 'active' && 'opacity-70'}`"
						/>
						<Skeleton v-else class="size-9 rounded-full" />
						<div v-if="user.computed.name" class="flex items-end gap-1">
							<span :class="`${user.status !== 'active' && 'text-muted-foreground'}`">
								{{ user.computed.name }}
							</span>
							<span v-if="user.status !== 'active'" class="text-xs text-muted-foreground italic">(Left)</span>
						</div>
						<Skeleton v-else class="w-22 h-6" />
					</div>
					<BalanceStrBadge v-if="usersBalanceStr" :balance-str="usersBalanceStr[userId]" />
					<Skeleton v-else class="w-24 h-5.5" />
				</div>
				<div v-else v-for="_ in 3" class="flex justify-between items-center">
					<div class="flex justify-center items-center gap-2">
						<Skeleton class="size-9 rounded-full" />
						<Skeleton class="w-22 h-6" />
					</div>
					<Skeleton class="w-24 h-5.5" />
				</div>
			</div>
		</CardContent>
	</Card>
</template>
