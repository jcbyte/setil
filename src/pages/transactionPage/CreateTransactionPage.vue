<script setup lang="ts">
import { Button } from "@/components/ui/button";
import YourAccountSettings from "@/components/YourAccountSettings.vue";
import useLiveGroupWithUserPublic from "@/composables/useLiveGroupWithUserPublic";
import { createTransaction as firebaseCreateTransaction } from "@/firebase/firestore/transaction";
import { sendNotification } from "@/firebase/messaging";
import type { Transaction } from "@/firebase/types";
import { noGroup } from "@/util/app";
import { formatCurrency, fromFirestoreAmount } from "@/util/currency";
import { getLeftUsersInTransaction, getRouteParam, getStatusUsers, sumRecordValues } from "@/util/util";
import { ArrowLeft } from "@lucide/vue";
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { toast } from "vue-sonner";
import TransactionDetailsForm from "./TransactionDetailsForm.vue";

const router = useRouter();
const route = useRoute();

const groupId = computed(() => getRouteParam(route.params.groupId));
const group = useLiveGroupWithUserPublic(groupId, () => noGroup(router));

const shownUsers = computed(() => getStatusUsers(group.value?.users ?? {}, new Set(["active"])));

const isTransactionCreating = ref<boolean>(false);

async function createTransaction(transaction: Transaction) {
	if (!groupId.value || !group.value?.users || !group.value.data) return;

	isTransactionCreating.value = true;

	const leftUsers = getLeftUsersInTransaction(transaction, group.value.users);

	try {
		await firebaseCreateTransaction(groupId.value, transaction, leftUsers);

		toast("Expense Created", { description: "It's on the group's tab." });
		sendNotification(
			groupId.value,
			group.value.data.name,
			`${group.value.users[transaction.from].computed.name} added expense ${transaction.title} for ${formatCurrency(
				fromFirestoreAmount(sumRecordValues(transaction.to), group.value.data.currency),
				group.value!.data.currency,
				false,
			)}.`,
			`/group/${groupId.value}?tab=activity`,
		);

		router.push({ path: `/group/${groupId.value}`, query: { tab: "activity" } });
	} catch (e) {
		toast.error("Error Saving Expense Details", { description: String(e) });
	}

	isTransactionCreating.value = false;
}
</script>

<template>
	<div>
		<div class="mx-auto w-full max-w-2xl flex flex-col gap-4">
			<div class="flex justify-between items-center">
				<div class="flex items-center gap-1">
					<RouterLink :to="`/group/${groupId}`">
						<Button type="button" variant="ghost" size="icon">
							<ArrowLeft class="size-5.5" />
						</Button>
					</RouterLink>
					<span class="text-lg font-semibold">New Expense</span>
				</div>
				<YourAccountSettings />
			</div>

			<TransactionDetailsForm
				:new-transaction="true"
				:group="group"
				:shown-users="shownUsers"
				:updating="isTransactionCreating"
				@submit="createTransaction"
			/>
		</div>
	</div>
</template>
