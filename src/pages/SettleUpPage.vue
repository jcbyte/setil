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
	DialogTrigger,
} from "@/components/ui/dialog";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import YourAccountSettings from "@/components/YourAccountSettings.vue";
import { useCurrentUser } from "@/composables/useCurrentUser";
import { useGroup } from "@/composables/useGroup";
import { useScreenSize } from "@/composables/useScreenSize";
import { createTransaction } from "@/firebase/firestore/transaction";
import { getPaymentDetails } from "@/firebase/firestore/user";
import { sendNotification } from "@/firebase/messaging";
import type { Transaction } from "@/firebase/types";
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
import { computed, ref, useTemplateRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import * as z from "zod";

const router = useRouter();
const route = useRoute();
const { toast } = useToast();
const { currentUser } = useCurrentUser();
const { breakpointSplit } = useScreenSize();

const routeGroupId = getRouteParam(route.params.groupId);
const { groupId, groupData, users } = useGroup(routeGroupId, () => {
	setFieldValue("from", currentUser.value!.uid);
});

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
		{ creditors: [], debtors: [] }
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

const usersPayments = computed<SimpleTransaction[] | undefined>(() =>
	users.value
		? resolveGroupDebts(
				Object.fromEntries(Object.entries(users.value).map(([userId, userData]) => [userId, userData.balance]))
		  )
		: undefined
);

const allowedPaymentUsers = computed<string[] | undefined>(() =>
	users.value
		? Object.entries(users.value)
				.filter(([, user]) => user.status !== "history")
				.map(([userId]) => userId)
		: undefined
);

function getPaymentBalanceStr(bal: number): BalanceStr {
	return getBalanceStr(
		bal,
		groupData.value!.currency,
		(bal) => `receives ${bal}`,
		(bal) => `owes ${bal}`,
		() => "in balance"
	);
}

const isMakingPayment = ref<boolean>(false);

const formSchema = toTypedSchema(
	z.object({
		from: z
			.string()
			.refine((val) => users.value && Object.keys(users.value).includes(val), "Must select a valid member"),
		to: z.string().refine((val) => users.value && Object.keys(users.value).includes(val), "Must select a valid member"),
		amount: z.number().refine((val) => val > 0, "An amount is required"),
	})
);

const { isFieldDirty, handleSubmit, setValues, values, setFieldValue } = useForm({
	validationSchema: formSchema,
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
			{ threshold: 0.5 }
		);

		observer.observe(element);
	});
}

async function fillForm(userPayment: SimpleTransaction) {
	setValues({
		from: userPayment.from,
		to: userPayment.to,
		amount: fromFirestoreAmount(userPayment.amount, groupData.value?.currency ?? "gbp"),
	});

	if (!recordPaymentPulser.value) return;
	await scrollToElement(recordPaymentPulser.value);
	recordPaymentPulser.value.classList.add("pulse");
	setTimeout(() => recordPaymentPulser.value!.classList.remove("pulse"), 500);
}

const onSubmit = handleSubmit(async (values) => {
	if (!groupId.value) return;

	isMakingPayment.value = true;

	const transaction: Transaction = {
		title: "Setil Up",
		from: values.from,
		date: Timestamp.now(),
		to: { [values.to]: toFirestoreAmount(values.amount, groupData.value!.currency) },
		category: "payment",
	};
	const leftUsers = getLeftUsersInTransaction(transaction, users.value!);

	try {
		await createTransaction(groupId.value, transaction, leftUsers);
		toast({ title: "Payment Recorded", description: "Someone's about to be rich!", duration: 5000 });
		sendNotification(
			groupId.value,
			groupData.value!.name,
			`${users.value![values.from].name} paid ${users.value![values.to].name} ${formatCurrency(
				values.amount,
				groupData.value!.currency,
				false
			)}.`,
			`/group/${groupId.value}?tab=summary`
		);
		router.push({ path: `/group/${routeGroupId}`, query: { tab: "activity" } });
	} catch (e) {
		toast({ title: "Error Saving Payment", description: String(e), variant: "destructive", duration: 5000 });
	}

	isMakingPayment.value = false;
});

const isBankDetailsDialogOpen = ref<boolean>(false);
const bankDetailsLoading = ref<boolean>(false);
const bankDetails = ref<PaymentDetails | null>(null);

watch(isBankDetailsDialogOpen, async () => {
	bankDetailsLoading.value = true;

	if (!values.to || !groupId.value) bankDetails.value = null;
	else bankDetails.value = await getPaymentDetails(values.to, groupId.value);

	bankDetailsLoading.value = false;
});
</script>

<template>
	<div class="w-full flex flex-col gap-4 items-center">
		<div class="w-full flex justify-between items-center">
			<div class="flex gap-2 justify-center items-center">
				<Button variant="ghost" class="size-9" @click="router.push(`/group/${routeGroupId}`)">
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
						v-if="groupId"
						v-for="userPayment in usersPayments"
						class="flex flex-col border border-border rounded-lg gap-4 p-4"
					>
						<div class="flex flex-col sm:flex-row justify-between items-center gap-2">
							<div class="flex items-center gap-2">
								<Avatar
									:src="users![userPayment.from].photoURL"
									:name="users![userPayment.from].name"
									class="size-10"
								/>
								<div class="flex flex-col gap-1">
									<span class="text-sm">{{ users![userPayment.from].name }}</span>
									<BalanceStrBadge :balanceStr="getPaymentBalanceStr(-userPayment.amount)" />
								</div>
							</div>
							<div>
								<component :is="breakpointSplit(ArrowDown, ArrowRight, 'sm')" class="text-muted-foreground" />
							</div>
							<div class="flex items-center gap-2">
								<div class="flex flex-col gap-1 text-right">
									<span class="text-sm">{{ users![userPayment.to].name }}</span>
									<BalanceStrBadge :balanceStr="getPaymentBalanceStr(userPayment.amount)" />
								</div>
								<Avatar :src="users![userPayment.to].photoURL" :name="users![userPayment.to].name" class="size-10" />
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

			<div v-if="groupId" class="border border-border rounded-lg flex flex-col gap-6 p-4 relative">
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
													<div v-if="groupId && values.from" class="flex items-center gap-2">
														<Avatar
															:src="users![values.from].photoURL"
															:name="users![values.from].name"
															class="size-6"
														/>
														<span>{{ users![values.from!].name }} </span>
													</div>
												</SelectValue>
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											<SelectItem v-for="userId in allowedPaymentUsers" :value="userId">
												<div class="flex items-center gap-2">
													<Avatar
														:src="users?.[userId].photoURL ?? null"
														:name="users?.[userId].name ?? 'Unloaded User'"
														:class="`size-5 ${users?.[userId].status !== 'active' && 'opacity-70'}`"
													/>
													<span :class="`${users?.[userId].status !== 'active' && 'text-muted-foreground'}`">
														{{ users?.[userId].name ?? "Unloaded User" }}
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
													<div v-if="groupId && values.to" class="flex items-center gap-2">
														<Avatar :src="users![values.to].photoURL" :name="users![values.to].name" class="size-6" />
														<span>{{ users![values.to!].name }} </span>
													</div>
												</SelectValue>
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											<SelectItem v-for="userId in allowedPaymentUsers" :value="userId">
												<div class="flex items-center gap-2">
													<Avatar
														:src="users?.[userId].photoURL ?? null"
														:name="users?.[userId].name ?? 'Unloaded User'"
														:class="`size-5 ${users?.[userId].status !== 'active' && 'opacity-70'}`"
													/>
													<span :class="`${users?.[userId].status !== 'active' && 'text-muted-foreground'}`">
														{{ users?.[userId].name ?? "Unloaded User" }}
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
											:placeholder="(0).toFixed(CurrencySettings[groupData!.currency].decimals)"
											:step="Math.pow(10, -CurrencySettings[groupData!.currency].decimals)"
											:disabled="isMakingPayment"
											v-bind="componentField"
										/>
									</FormControl>
									<span class="absolute left-0 inset-y-0 flex items-center justify-center px-2 text-muted-foreground">
										{{ CurrencySettings[groupData!.currency].symbol }}
									</span>
								</div>
								<FormMessage />
							</FormItem>
						</FormField>
					</div>

					<div class="flex gap-2 justify-between items-center">
						<Dialog v-model:open="isBankDetailsDialogOpen">
							<DialogTrigger as-child>
								<Button type="button" :disabled="!values.to" class="w-fit" variant="outline">
									<Landmark />
									<span>View Bank Details</span>
								</Button>
							</DialogTrigger>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>Bank Details</DialogTitle>
									<DialogDescription>
										Where {{ users?.[values.to!].name ?? "Unloaded User" }} would like payment.
									</DialogDescription>
								</DialogHeader>

								<Skeleton v-if="bankDetailsLoading" class="w-full h-[160px]" />
								<div
									v-else-if="!bankDetails"
									class="text-center text-muted-foreground p-4 border border-border rounded-lg"
								>
									Looks like {{ users?.[values.to!].name ?? "Unloaded User" }} hasn't added their bank info yet.
								</div>
								<div v-else class="mx-2 py-2 border border-border rounded-lg">
									<div v-if="bankDetails.type === 'UK'" class="grid grid-cols-2 gap-y-1 gap-x-2 items-center">
										<span class="col-span-2 text-center font-medium mb-2">UK Bank Account</span>
										<span class="text-right text-sm">Name:</span>
										<CopyButton :text="bankDetails.name" />
										<span class="text-right text-sm">Sort Code:</span>
										<CopyButton :text="bankDetails.sortCode" />
										<span class="text-right text-sm">Account Number:</span>
										<CopyButton :text="bankDetails.accountNumber" />
									</div>
									<div v-else-if="bankDetails.type === 'US'" class="grid grid-cols-2 gap-1 items-center">
										<span class="col-span-2 text-center font-medium mb-2">US Bank Account</span>
										<span class="text-right text-sm">Name:</span>
										<CopyButton :text="bankDetails.name" />
										<span class="text-right text-sm">Routing Number:</span>
										<CopyButton :text="bankDetails.routingNumber" />
										<span class="text-right text-sm">Account Number:</span>
										<CopyButton :text="bankDetails.accountNumber" />
									</div>
									<div v-else-if="bankDetails.type === 'SEPA'" class="grid grid-cols-2 gap-1 items-center">
										<span class="col-span-2 text-center font-medium mb-2">SEPA Details</span>
										<span class="text-right text-sm">Name:</span>
										<CopyButton :text="bankDetails.name" />
										<span class="text-right text-sm">IBAN:</span>
										<CopyButton :text="bankDetails.IBAN" />
										<span v-if="bankDetails.BIC" class="text-right text-sm">BIC / SWIFT Code:</span>
										<CopyButton v-if="bankDetails.BIC" :text="bankDetails.BIC" />
									</div>
									<div v-else-if="bankDetails.type === 'SWIFT'" class="grid grid-cols-2 gap-1 items-center">
										<span class="col-span-2 text-center font-medium mb-2">SWIFT Details</span>
										<span class="text-right text-sm">Name:</span>
										<CopyButton :text="bankDetails.name" />
										<span class="text-right text-sm">BIC / SWIFT Code:</span>
										<CopyButton :text="bankDetails.SWIFT" />
										<span class="text-right text-sm">Account Number / IBAN:</span>
										<CopyButton :text="bankDetails.IBAN" />
										<span v-if="bankDetails.bankName" class="text-right text-sm">Bank Name:</span>
										<CopyButton v-if="bankDetails.bankName" :text="bankDetails.bankName" />
										<span v-if="bankDetails.bankAddress" class="text-right text-sm">Bank Address:</span>
										<CopyButton v-if="bankDetails.bankAddress" :text="bankDetails.bankAddress" />
									</div>
								</div>

								<DialogFooter>
									<DialogClose as-child>
										<Button type="button">Close</Button>
									</DialogClose>
								</DialogFooter>
							</DialogContent>
						</Dialog>

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
