<script setup lang="ts">
import Button from "@/components/ui/button/Button.vue";
import YourAccountSettings from "@/components/YourAccountSettings.vue";
import useLiveGroupWithUserPublic from "@/composables/useLiveGroupWithUserPublic";
import { updateTransaction as firestoreUpdateTransaction } from "@/firebase/firestore/transaction";
import type { Transaction } from "@/firebase/types";
import { noGroup } from "@/util/app";
import { fromFirestoreAmount } from "@/util/currency.ts";
import { gcdN } from "@/util/math.ts";
import { getLeftUsersInTransaction, getRouteParam, sumRecordValues } from "@/util/util";
import { fromDate, getLocalTimeZone } from "@internationalized/date";
import { ArrowLeft } from "@lucide/vue";
import { computed, ref, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import { toast } from "vue-sonner";
import type { TransactionDetailsFormExposed } from "./TransactionDetailsForm.vue";
import TransactionDetailsForm from "./TransactionDetailsForm.vue";

const router = useRouter();
const route = useRoute();

const groupId = computed(() => getRouteParam(route.params.groupId));
const group = useLiveGroupWithUserPublic(groupId, () => noGroup(router));
const transactionId = computed(() => getRouteParam(route.params.transactionId));

const hasThisTransactionLoaded = ref(false);

const transactionDetailsForm = ref<TransactionDetailsFormExposed | null>(null);

watch(
	group,
	(groupValue) => {
		if (!groupValue) {
			hasThisTransactionLoaded.value = false;
			return;
		}

		if (!hasThisTransactionLoaded.value && groupValue.data && groupValue.transactions && transactionId.value) {
			const transaction = groupValue.transactions[transactionId.value];
			const transactionGcd = gcdN(Object.values(transaction.to).filter((v) => v));
			const transactionPeople = Object.fromEntries(
				Object.entries(transaction.to).map(([userId, amount]) => {
					return [userId, { selected: !!amount, num: amount / transactionGcd }];
				}),
			);

			transactionDetailsForm.value?.reset({
				title: transaction.title,
				date: fromDate(transaction.date.toDate(), getLocalTimeZone()),
				from: transaction.from,
				amount: fromFirestoreAmount(sumRecordValues(transaction.to), groupValue.data.currency),
				category: transaction.category,
				to: {
					type: "ratio",
					people: transactionPeople,
				},
			});

			hasThisTransactionLoaded.value = true;
		}
	},
	{ immediate: true },
);

const isTransactionUpdating = ref<boolean>(false);

async function updateTransaction(transaction: Transaction) {
	if (!groupId.value || !transactionId.value || !group.value?.users) return;

	isTransactionUpdating.value = true;

	const leftUsers = getLeftUsersInTransaction(transaction, group.value.users);

	try {
		await firestoreUpdateTransaction(groupId.value, transactionId.value, transaction, leftUsers);

		toast("Expense Details Updated", {
			description: "Your expense got a makeover, and it's ready to slay.",
		});
		router.push({ path: `/group/${groupId.value}`, query: { tab: "activity" } });
	} catch (e) {
		toast.error("Error Saving Expense Details", { description: String(e) });
	}

	isTransactionUpdating.value = false;
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
					<span class="text-lg font-semibold">Edit Expense</span>
				</div>
				<YourAccountSettings />
			</div>

			<TransactionDetailsForm
				ref="transactionDetailsForm"
				:new-transaction="false"
				:group="group"
				:initial-loading="!hasThisTransactionLoaded"
				:updating="isTransactionUpdating"
				@submit="updateTransaction"
			/>
		</div>
	</div>
</template>
