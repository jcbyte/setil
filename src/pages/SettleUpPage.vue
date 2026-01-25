<script setup lang="ts">
import Avatar from "@/components/Avatar.vue";
import BalanceStrBadge, { type BalanceStr } from "@/components/BalanceStrBadge.vue";
import CopyButton from "@/components/CopyButton.vue";
import LoaderIcon from "@/components/LoaderIcon.vue";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import YourAccountSettings from "@/components/YourAccountSettings.vue";
import { useControlledDialog } from "@/composables/useControlledDialog";
import { useCurrentUser } from "@/composables/useCurrentUser";
import useLiveGroupWithUserPublic from "@/composables/useLiveUserGroupWithUserPublic";
import { useScreenSize } from "@/composables/useScreenSize";
import { createTransaction } from "@/firebase/firestore/transaction";
import { getPaymentDetails } from "@/firebase/firestore/user";
import { sendNotification } from "@/firebase/messaging";
import type { Transaction } from "@/firebase/types";
import { noGroup } from "@/util/app";
import {
	CurrencySettings,
	formatCurrency,
	fromFirestoreAmount,
	getBalanceStr,
	toFirestoreAmount,
} from "@/util/currency";
import { type PaymentDetails } from "@/util/paymentDetails";
import { getLeftUsersInTransaction, getRouteParam } from "@/util/util";
import { toTypedSchema } from "@vee-validate/zod";
import { Timestamp } from "firebase/firestore";
import { ArrowDown, ArrowLeft, ArrowRight, Landmark, Wallet } from "lucide-vue-next";
import { useForm } from "vee-validate";
import { computed, ref, useTemplateRef } from "vue";
import { useRoute, useRouter } from "vue-router";
import * as z from "zod";

const router = useRouter();
const route = useRoute();
const { toast } = useToast();
const { currentUser } = useCurrentUser();
const { breakpointSplit } = useScreenSize();

const groupId = getRouteParam(route.params.groupId);

if (!groupId) {
	noGroup();
	throw "No groupId";
}
const group = useLiveGroupWithUserPublic(groupId, noGroup);

interface SimpleTransaction {
	from: string;
	to: string;
	amount: number;
}

function resolveGroupDebts(debts: Record<string, number>): SimpleTransaction[] {
	const balances = { ...debts };

	// Separate users globally in credit/debt
	const { creditors, debtors } = Object.entries(balances).reduce<{ creditors: string[]; debtors: string[] }>(
		({ creditors, debtors }, [userId, resolvedDebt]) => {
			if (resolvedDebt > 0) creditors.push(userId);
			else if (resolvedDebt < 0) debtors.push(userId);
			return { creditors, debtors };
		},
		{ creditors: [], debtors: [] },
	);

	const newDebts: { from: string; to: string; amount: number }[] = [];

	// Match debtors and creditors to minimise transactions
	let currentCreditor = 0;
	let currentDebtor = 0;

	while (currentCreditor < creditors.length && currentDebtor < debtors.length) {
		const creditor = creditors[currentCreditor];
		const debtor = debtors[currentDebtor];

		// Determine the max amount that can be settled between these two users
		const amount = Math.min(Math.abs(balances[creditor]), Math.abs(balances[debtor]));

		// Add this transaction
		newDebts.push({ from: debtor, to: creditor, amount });

		// Subtract remaining debts of these users
		balances[creditor] -= amount;
		balances[debtor] += amount;

		// If this creditor/debtor is in ballance then move to the next one
		if (balances[creditor] === 0) currentCreditor++;
		if (balances[debtor] === 0) currentDebtor++;
	}

	return newDebts;
}

const usersPayments = computed<SimpleTransaction[] | null>(() =>
	group.value
		? resolveGroupDebts(
				Object.fromEntries(Object.entries(group.value.users).map(([userId, userData]) => [userId, userData.balance])),
			)
		: null,
);

const allowedPaymentUsers = computed<string[] | null>(() =>
	group.value
		? Object.entries(group.value.users)
				.filter(([, user]) => user.status !== "history")
				.map(([userId]) => userId)
		: null,
);

function getPaymentBalanceStr(bal: number): BalanceStr {
	return getBalanceStr(
		bal,
		group.value!.data.currency,
		(bal) => `receives ${bal}`,
		(bal) => `owes ${bal}`,
		() => "in balance",
	);
}

const isMakingPayment = ref<boolean>(false);

const formSchema = toTypedSchema(
	z.object({
		from: z
			.string()
			.refine((val) => group.value && Object.keys(group.value.users).includes(val), "Must select a valid member"),
		to: z
			.string()
			.refine((val) => group.value && Object.keys(group.value.users).includes(val), "Must select a valid member"),
		amount: z.number().refine((val) => val > 0, "An amount is required"),
	}),
);

const { isFieldDirty, handleSubmit, setValues, values } = useForm({
	validationSchema: formSchema,
	initialValues: { from: currentUser.value?.uid },
});

const recordPaymentPulser = useTemplateRef("record-payment-pulser");

async function scrollToElement(element: HTMLElement): Promise<void> {
	return new Promise((resolve) => {
		element.scrollIntoView({ behavior: "smooth", block: "center" });

		// Create an IntersectionObserver to detect when the element is visible
		const observer = new IntersectionObserver(
			(entries, observer) => {
				if (entries[0].isIntersecting) {
					// Stop observing and resolve
					observer.disconnect();
					resolve();
				}
			},
			{ threshold: 0.5 },
		);

		observer.observe(element);
	});
}

async function fillForm(userPayment: SimpleTransaction) {
	setValues({
		from: userPayment.from,
		to: userPayment.to,
		amount: fromFirestoreAmount(userPayment.amount, group.value?.data.currency ?? "gbp"),
	});

	if (!recordPaymentPulser.value) return;
	await scrollToElement(recordPaymentPulser.value);
	recordPaymentPulser.value.classList.add("pulse");
	setTimeout(() => recordPaymentPulser.value!.classList.remove("pulse"), 500);
}

const onSubmit = handleSubmit(async (values) => {
	if (!groupId) return;
	if (!group.value) return;

	isMakingPayment.value = true;

	const transaction: Transaction = {
		title: "Setil Up",
		from: values.from,
		date: Timestamp.now(),
		to: { [values.to]: toFirestoreAmount(values.amount, group.value.data.currency) },
		category: "payment",
	};
	const leftUsers = getLeftUsersInTransaction(transaction, group.value.users);

	try {
		await createTransaction(groupId, transaction, leftUsers);
		toast({ title: "Payment Recorded", description: "Someone's about to be rich!", duration: 5000 });
		sendNotification(
			groupId,
			group.value.data.name,
			`${group.value.users[values.from].nickname} paid ${group.value.users[values.to].nickname} ${formatCurrency(
				values.amount,
				group.value.data.currency,
				false,
			)}.`,
			`/group/${groupId}?tab=summary`,
		);
		router.push({ path: `/group/${groupId}`, query: { tab: "activity" } });
	} catch (e) {
		toast({ title: "Error Saving Payment", description: String(e), variant: "destructive", duration: 5000 });
	}

	isMakingPayment.value = false;
});

const {
	open: bankDetailsDialogOpen,
	processing: bankDetailsDialogProcessing,
	openDialog: openBankDetailsDialogRaw,
	startDialogProcessing: startBankDetailsDialogProcessing,
	finishDialogProcessing: finishBankDetailsDialogProcessing,
	data: bankDetailsData,
} = useControlledDialog<PaymentDetails | null>();

async function openBankDetailsDialog() {
	if (!groupId) return;

	openBankDetailsDialogRaw(null);

	startBankDetailsDialogProcessing();
	bankDetailsData.value = values.to ? await getPaymentDetails(values.to, groupId) : null;
	finishBankDetailsDialogProcessing();
}
</script>

<!-- todo only show bank details when bank details exist -->

<template>
	<div>
		<div class="w-full flex flex-col gap-4 items-center">
			<div class="w-full flex justify-between items-center">
				<div class="flex gap-2 justify-center items-center">
					<Button variant="ghost" class="size-9" @click="router.push(`/group/${groupId}`)">
						<ArrowLeft class="!size-6" />
					</Button>
					<span class="text-lg font-semibold">Setil Up</span>
				</div>
				<div class="flex gap-2 justify-center items-center">
					<YourAccountSettings />
				</div>
			</div>

			<div class="w-full max-w-[32rem] flex flex-col gap-4">
				<div class="border border-border rounded-lg flex flex-col gap-6 p-4">
					<div class="flex flex-col">
						<span class="text-lg font-semibold">Payments Needed</span>
						<span class="text-sm text-muted-foreground">
							Here's what needs to be <span class="font-bold">Setil</span>'d in this group
						</span>
					</div>

					<div class="flex flex-col gap-2">
						<div
							v-if="group"
							v-for="userPayment in usersPayments"
							class="flex flex-col border border-border rounded-lg gap-4 p-4"
						>
							<div class="flex flex-col sm:flex-row justify-between items-center gap-2">
								<div class="flex items-center gap-2">
									<Avatar
										:src="group.users[userPayment.from].public?.photoURL ?? null"
										:name="group.users[userPayment.from].nickname"
										class="size-10"
									/>
									<div class="flex flex-col gap-1">
										<span class="text-sm">{{ group.users[userPayment.from].nickname }}</span>
										<BalanceStrBadge :balanceStr="getPaymentBalanceStr(-userPayment.amount)" />
									</div>
								</div>
								<div>
									<component :is="breakpointSplit(ArrowDown, ArrowRight, 'sm')" class="text-muted-foreground" />
								</div>
								<div class="flex items-center gap-2">
									<div class="flex flex-col gap-1 text-right">
										<span class="text-sm">{{ group.users[userPayment.to].nickname }}</span>
										<BalanceStrBadge :balanceStr="getPaymentBalanceStr(userPayment.amount)" />
									</div>
									<Avatar
										:src="group.users[userPayment.to].public?.photoURL ?? null"
										:name="group.users[userPayment.to].nickname"
										class="size-10"
									/>
								</div>
							</div>
							<Button variant="outline" @click="fillForm(userPayment)">Record this payment</Button>
						</div>
						<Skeleton v-else v-for="_n in 3" class="w-full h-32" />
						<div v-if="usersPayments?.length === 0" class="flex justify-center">
							<span class="text-muted-foreground">No payments needed</span>
						</div>
					</div>
				</div>

				<div v-if="group" class="border border-border rounded-lg flex flex-col gap-6 p-4 relative">
					<div
						class="absolute inset-0 bg-zinc-100 rounded-lg pointer-events-none opacity-0"
						ref="record-payment-pulser"
					/>

					<div class="flex flex-col">
						<span class="text-lg font-semibold">Record Payment</span>
						<span class="text-sm text-muted-foreground">Settle debts between group members</span>
					</div>

					<form class="flex flex-col gap-4" @submit="onSubmit">
						<div class="flex flex-col gap-2">
							<div class="flex gap-2">
								<FormField v-slot="{ componentField }" name="from" :validate-on-blur="!isFieldDirty">
									<FormItem class="flex-1">
										<FormLabel>From</FormLabel>
										<Select v-bind="componentField" :disabled="isMakingPayment">
											<FormControl>
												<SelectTrigger>
													<SelectValue placeholder="Select a member">
														<div v-if="values.from" class="flex items-center gap-2">
															<Avatar
																:src="group.users[values.from].public?.photoURL ?? null"
																:name="group.users[values.from].nickname"
																class="size-6"
															/>
															<span>{{ group.users[values.from].nickname }} </span>
														</div>
													</SelectValue>
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectItem v-for="userId in allowedPaymentUsers" :value="userId">
													<div class="flex items-center gap-2">
														<Avatar
															:src="group.users[userId].public?.photoURL ?? null"
															:name="group.users[userId].nickname"
															:class="`size-5 ${group.users[userId].status !== 'active' && 'opacity-70'}`"
														/>
														<span :class="`${group.users[userId].status !== 'active' && 'text-muted-foreground'}`">
															{{ group.users[userId].nickname }}
														</span>
													</div>
												</SelectItem>
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								</FormField>

								<FormField v-slot="{ componentField }" name="to" :validate-on-blur="!isFieldDirty">
									<FormItem class="flex-1">
										<FormLabel>Recipient</FormLabel>
										<Select v-bind="componentField" :disabled="isMakingPayment">
											<FormControl>
												<SelectTrigger>
													<SelectValue placeholder="Select a member">
														<div v-if="values.to" class="flex items-center gap-2">
															<Avatar
																:src="group.users[values.to].public?.photoURL ?? null"
																:name="group.users[values.to].nickname"
																class="size-6"
															/>
															<span>{{ group.users[values.to!].nickname }} </span>
														</div>
													</SelectValue>
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectItem v-for="userId in allowedPaymentUsers" :value="userId">
													<div class="flex items-center gap-2">
														<Avatar
															:src="group.users[userId].public?.photoURL ?? null"
															:name="group.users[userId].nickname"
															:class="`size-5 ${group.users[userId].status !== 'active' && 'opacity-70'}`"
														/>
														<span :class="`${group.users[userId].status !== 'active' && 'text-muted-foreground'}`">
															{{ group.users[userId].nickname }}
														</span>
													</div>
												</SelectItem>
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								</FormField>
							</div>

							<FormField v-slot="{ componentField }" name="amount" :validate-on-blur="!isFieldDirty">
								<FormItem class="flex-1">
									<FormLabel>Amount</FormLabel>
									<div class="relative items-center">
										<FormControl>
											<Input
												type="number"
												class="pl-6"
												:placeholder="(0).toFixed(CurrencySettings[group.data.currency].decimals)"
												:step="Math.pow(10, -CurrencySettings[group.data.currency].decimals)"
												:disabled="isMakingPayment"
												v-bind="componentField"
											/>
										</FormControl>
										<span class="absolute left-0 inset-y-0 flex items-center justify-center px-2 text-muted-foreground">
											{{ CurrencySettings[group.data.currency].symbol }}
										</span>
									</div>
									<FormMessage />
								</FormItem>
							</FormField>
						</div>

						<div class="flex gap-2 justify-between items-center">
							<Button
								type="button"
								:disabled="!values.to"
								class="w-fit"
								variant="outline"
								@click="openBankDetailsDialog"
							>
								<Landmark />
								<span>View Bank Details</span>
							</Button>

							<Button type="submit" :disabled="isMakingPayment" class="w-fit">
								<LoaderIcon :icon="Wallet" :loading="isMakingPayment" />
								<span>Record Payment</span>
							</Button>
						</div>
					</form>
				</div>
				<Skeleton v-else class="w-full max-w-[32rem] h-72" />
			</div>
		</div>

		<Dialog v-model:open="bankDetailsDialogOpen">
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Bank Details</DialogTitle>
					<DialogDescription> Where {{ group!.users[values.to!].nickname }} would like payment. </DialogDescription>
				</DialogHeader>

				<Skeleton v-if="bankDetailsDialogProcessing" class="w-full h-[160px]" />
				<div v-else-if="!bankDetailsData" class="text-center text-muted-foreground p-4 border border-border rounded-lg">
					Looks like {{ group!.users[values.to!].nickname }} hasn't added their bank info yet.
				</div>
				<div v-else class="mx-2 py-2 border border-border rounded-lg">
					<div v-if="bankDetailsData.type === 'UK'" class="grid grid-cols-2 gap-y-1 gap-x-2 items-center">
						<span class="col-span-2 text-center font-medium mb-2">UK Bank Account</span>
						<span class="text-right text-sm">Name:</span>
						<CopyButton :text="bankDetailsData.name" />
						<span class="text-right text-sm">Sort Code:</span>
						<CopyButton :text="bankDetailsData.sortCode" />
						<span class="text-right text-sm">Account Number:</span>
						<CopyButton :text="bankDetailsData.accountNumber" />
					</div>
					<div v-else-if="bankDetailsData.type === 'US'" class="grid grid-cols-2 gap-1 items-center">
						<span class="col-span-2 text-center font-medium mb-2">US Bank Account</span>
						<span class="text-right text-sm">Name:</span>
						<CopyButton :text="bankDetailsData.name" />
						<span class="text-right text-sm">Routing Number:</span>
						<CopyButton :text="bankDetailsData.routingNumber" />
						<span class="text-right text-sm">Account Number:</span>
						<CopyButton :text="bankDetailsData.accountNumber" />
					</div>
					<div v-else-if="bankDetailsData.type === 'SEPA'" class="grid grid-cols-2 gap-1 items-center">
						<span class="col-span-2 text-center font-medium mb-2">SEPA Details</span>
						<span class="text-right text-sm">Name:</span>
						<CopyButton :text="bankDetailsData.name" />
						<span class="text-right text-sm">IBAN:</span>
						<CopyButton :text="bankDetailsData.IBAN" />
						<span v-if="bankDetailsData.BIC" class="text-right text-sm">BIC / SWIFT Code:</span>
						<CopyButton v-if="bankDetailsData.BIC" :text="bankDetailsData.BIC" />
					</div>
					<div v-else-if="bankDetailsData.type === 'SWIFT'" class="grid grid-cols-2 gap-1 items-center">
						<span class="col-span-2 text-center font-medium mb-2">SWIFT Details</span>
						<span class="text-right text-sm">Name:</span>
						<CopyButton :text="bankDetailsData.name" />
						<span class="text-right text-sm">BIC / SWIFT Code:</span>
						<CopyButton :text="bankDetailsData.SWIFT" />
						<span class="text-right text-sm">Account Number / IBAN:</span>
						<CopyButton :text="bankDetailsData.IBAN" />
						<span v-if="bankDetailsData.bankName" class="text-right text-sm">Bank Name:</span>
						<CopyButton v-if="bankDetailsData.bankName" :text="bankDetailsData.bankName" />
						<span v-if="bankDetailsData.bankAddress" class="text-right text-sm">Bank Address:</span>
						<CopyButton v-if="bankDetailsData.bankAddress" :text="bankDetailsData.bankAddress" />
					</div>
				</div>

				<DialogFooter>
					<DialogClose as-child>
						<Button type="button">Close</Button>
					</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	</div>
</template>

<style scoped>
@keyframes pulse {
	0% {
		opacity: 0;
	}
	50% {
		opacity: 0.25;
	}
	100% {
		opacity: 0;
	}
}

.pulse {
	animation: pulse 500ms ease-in-out;
}
</style>
