<script setup lang="ts">
import Avatar from "@/components/Avatar.vue";
import BalanceStrBadge, { type BalanceStr } from "@/components/BalanceStrBadge.vue";
import BankDetailsCardView from "@/components/BankDetailsCardView.vue";
import LoaderIcon from "@/components/LoaderIcon.vue";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import UserSelect from "@/components/UserSelect.vue";
import YourAccountSettings from "@/components/YourAccountSettings.vue";
import { useControlledDialog } from "@/composables/useControlledDialog";
import { useCurrentUser } from "@/composables/useCurrentUser";
import useLiveGroupWithUserPublic from "@/composables/useLiveGroupWithUserPublic";
import { useScreenSize } from "@/composables/useScreenSize";
import { createTransaction } from "@/firebase/firestore/transaction";
import { getPaymentDetails } from "@/firebase/firestore/user";
import { sendNotification } from "@/firebase/messaging";
import type { Transaction } from "@/types/firestore";
import { type PaymentDetails } from "@/types/paymentDetails";
import { noGroup } from "@/util/app";
import { resolveGroupDebts, type SimpleTransaction } from "@/util/split";
import { getBalanceStr, getLeftUsersInTransaction, getRouteParam, getStatusUsers } from "@/util/util";
import { ArrowDown, ArrowLeft, ArrowRight, Landmark, PartyPopper, Wallet } from "@lucide/vue";
import { CurrencySettings, fromFirestoreAmount, toFirestoreAmount } from "@shared/currency";
import { toTypedSchema } from "@vee-validate/zod";
import { Timestamp } from "firebase/firestore";
import { useForm, Field as VeeField } from "vee-validate";
import { computed, ref } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import { toast } from "vue-sonner";
import * as z from "zod";

const router = useRouter();
const route = useRoute();
const currentUser = useCurrentUser();
const { breakpointSplit } = useScreenSize();

const groupId = computed(() => getRouteParam(route.params.groupId));
const group = useLiveGroupWithUserPublic(groupId, () => noGroup(router));

const requiredPayments = computed<SimpleTransaction[] | null>(() => {
	if (!group.value?.users) return null;
	try {
		return resolveGroupDebts(
			Object.fromEntries(Object.entries(group.value.users).map(([userId, userData]) => [userId, userData.balance])),
		);
	} catch {
		return null;
	}
});

function getPaymentBalanceStr(bal: number): BalanceStr | null {
	if (!group.value?.data) return null;

	return getBalanceStr(
		bal,
		(bal) => `receives ${bal}`,
		(bal) => `owes ${bal}`,
		() => "in balance",
		group.value.data.currency,
	);
}

const nonHistoricalUsers = computed(() => getStatusUsers(group.value?.users ?? {}, new Set(["active", "left"])));

const currencySetting = computed(() =>
	group.value?.data?.currency ? CurrencySettings[group.value.data.currency] : null,
);

const formSchema = toTypedSchema(
	z
		.object({
			from: z
				.string()
				.refine(
					(val) => group.value?.users && Object.keys(group.value.users).includes(val),
					"Must select a valid member",
				),
			to: z
				.string()
				.refine(
					(val) => group.value?.users && Object.keys(group.value.users).includes(val),
					"Must select a valid member",
				),
			amount: z.coerce.number().refine((val) => val > 0, "An amount is required"),
		})
		.refine(({ from, to }) => from !== to, { message: "Sender and recipient must be different", path: ["to"] }),
);

const { handleSubmit, setValues, values, meta } = useForm({
	validationSchema: formSchema,
	initialValues: { from: currentUser.value?.uid },
});

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

function pulseElement(element: HTMLElement, timeout: number = 500) {
	element.classList.add("pulse");
	setTimeout(() => element.classList.remove("pulse"), timeout);
}

const recordPaymentPulser = ref<HTMLElement | null>(null);
async function fillForm(userPayment: SimpleTransaction) {
	if (!group.value?.data) return;

	// Don't reset as we want the form to be "dirty"
	setValues({
		from: userPayment.from,
		to: userPayment.to,
		amount: fromFirestoreAmount(userPayment.amount, group.value.data.currency),
	});

	if (!recordPaymentPulser.value) return;
	await scrollToElement(recordPaymentPulser.value);
	pulseElement(recordPaymentPulser.value);
}

const isMakingPayment = ref<boolean>(false);

const onSubmit = handleSubmit(async (values) => {
	if (!groupId.value || !group.value?.data || !group.value?.users) return;

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
		const transactionId = await createTransaction(groupId.value, transaction, leftUsers);

		toast("Payment Recorded", { description: "Someone's about to be rich!" });
		sendNotification(groupId.value, { type: "new-payment", transactionId });

		router.push({ path: `/group/${groupId.value}`, query: { tab: "activity" } });
	} catch (e) {
		toast.error("Error Saving Payment", { description: String(e) });
	}

	isMakingPayment.value = false;
});

const bankDetailsDialog = useControlledDialog<{ userId: string; details: PaymentDetails | null }>();

async function openBankDetailsDialog() {
	if (!groupId.value || !values.to) return;

	bankDetailsDialog.openDialog({ userId: values.to, details: null });
	bankDetailsDialog.startDialogProcessing();
	bankDetailsDialog.data.value!.details = await getPaymentDetails(values.to, groupId.value);
	bankDetailsDialog.finishDialogProcessing();
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
					<span class="text-lg font-semibold">Setil Up</span>
				</div>
				<YourAccountSettings />
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Payments Needed</CardTitle>
					<CardDescription>Here's what needs to be Setil'd in this group</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="flex flex-col gap-2">
						<template v-if="group?.users && requiredPayments">
							<div
								v-if="requiredPayments.length > 0"
								v-for="payment in requiredPayments"
								:key="`${payment.from}-${payment.to}-${payment.amount}`"
								class="flex flex-col gap-3 border-b last:border-b-0 border-border/60 py-4 first:pt-0 last:pb-0"
							>
								<div class="flex flex-col sm:flex-row justify-between items-center gap-2.5">
									<div class="flex items-center gap-2">
										<Avatar
											v-if="group.users[payment.from].computed.name"
											:src="group.users[payment.from].public?.photoUrl ?? null"
											:name="group.users[payment.from].computed.name!"
											class="size-10"
										/>
										<Skeleton v-else class="size-10 rounded-full" />
										<div class="flex flex-col gap-1">
											<span v-if="group.users[payment.from].computed.name" class="text-sm">
												{{ group.users[payment.from].computed.name }}
											</span>
											<Skeleton v-else class="w-18 h-5" />
											<BalanceStrBadge :balanceStr="getPaymentBalanceStr(-payment.amount)" />
										</div>
									</div>
									<component :is="breakpointSplit(ArrowDown, ArrowRight, 'sm')" class="text-muted-foreground" />
									<div class="flex items-center gap-2">
										<div class="flex flex-col gap-1 text-right">
											<span v-if="group.users[payment.to].computed.name" class="text-sm">
												{{ group.users[payment.to].computed.name }}
											</span>
											<Skeleton v-else class="w-18 h-5" />
											<BalanceStrBadge :balanceStr="getPaymentBalanceStr(payment.amount)" />
										</div>
										<Avatar
											v-if="group.users[payment.to].computed.name"
											:src="group.users[payment.to].public?.photoUrl ?? null"
											:name="group.users[payment.to].computed.name!"
											class="size-10"
										/>
										<Skeleton v-else class="size-10 rounded-full" />
									</div>
								</div>
								<Button type="button" variant="secondary" class="h-8" @click="fillForm(payment)"
									>Record this payment</Button
								>
							</div>

							<Empty v-else>
								<EmptyHeader>
									<EmptyMedia variant="icon">
										<PartyPopper />
									</EmptyMedia>
									<EmptyTitle>All Setil'd up!</EmptyTitle>
									<EmptyDescription>No payments needed right now</EmptyDescription>
								</EmptyHeader>
							</Empty>
						</template>
						<Skeleton v-else v-for="_ in 3" class="w-full h-55 sm:h-32" />
					</div>
				</CardContent>
			</Card>

			<Card class="relative">
				<CardHeader>
					<CardTitle>Record Payment</CardTitle>
					<CardDescription>Settle debts between group members</CardDescription>
				</CardHeader>
				<CardContent>
					<form id="payment-form" @submit="onSubmit">
						<FieldGroup>
							<div class="flex items-start gap-2">
								<VeeField v-slot="{ componentField, errors }" name="from">
									<Field :data-invalid="!!errors.length">
										<FieldLabel for="from">Send from</FieldLabel>
										<UserSelect
											v-bind="componentField"
											id="from"
											:users="nonHistoricalUsers"
											:selected-user="values.from"
											:disabled="isMakingPayment"
										/>
										<FieldError v-if="errors.length" :errors="errors" />
									</Field>
								</VeeField>

								<VeeField v-slot="{ componentField, errors }" name="to">
									<Field :data-invalid="!!errors.length">
										<FieldLabel for="to">Send to</FieldLabel>
										<UserSelect
											v-bind="componentField"
											id="to"
											:users="nonHistoricalUsers"
											:selected-user="values.to"
											:disabled="isMakingPayment"
										/>
										<FieldError v-if="errors.length" :errors="errors" />
									</Field>
								</VeeField>
							</div>

							<VeeField v-slot="{ componentField, errors }" name="amount">
								<Field :data-invalid="!!errors.length">
									<FieldLabel for="amount">Amount</FieldLabel>
									<InputGroup>
										<InputGroupInput
											id="amount"
											type="number"
											:placeholder="(12.3).toFixed(currencySetting?.decimals ?? 2)"
											:step="Math.pow(10, -(currencySetting?.decimals ?? 2))"
											:disabled="isMakingPayment"
											v-bind="componentField"
										/>
										<InputGroupAddon v-if="currencySetting">
											{{ currencySetting.symbol }}
										</InputGroupAddon>
									</InputGroup>

									<FieldError v-if="errors.length" :errors="errors" />
								</Field>
							</VeeField>
						</FieldGroup>
					</form>
				</CardContent>
				<CardFooter class="justify-between gap-2">
					<Button
						v-if="values.to && group?.users?.[values.to].public?.hasBankDetails"
						type="button"
						variant="outline"
						@click="openBankDetailsDialog"
					>
						<Landmark />
						<span> {{ breakpointSplit("Bank Details", "View Bank Details", "sm") }} </span>
					</Button>

					<Button type="submit" form="payment-form" class="ms-auto" :disabled="isMakingPayment || !meta.valid">
						<LoaderIcon :icon="Wallet" :loading="isMakingPayment" />
						<span>Record Payment</span>
					</Button>
				</CardFooter>
				<div ref="recordPaymentPulser" class="absolute inset-0 bg-accent rounded-lg pointer-events-none opacity-0" />
			</Card>
		</div>

		<Dialog v-model:open="bankDetailsDialog.open.value">
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Bank Details</DialogTitle>
					<DialogDescription>
						<span>Where</span>
						<span v-if="group?.users?.[bankDetailsDialog.data.value!.userId].computed.name" class="mx-0.5">
							{{ group.users[bankDetailsDialog.data.value!.userId].computed.name }}
						</span>
						<Skeleton v-else class="inline-block align-middle w-14 h-4.25 mx-0.5" />
						<span>would like payment.</span>
					</DialogDescription>
				</DialogHeader>

				<Skeleton v-if="bankDetailsDialog.processing.value" class="w-full h-47" />
				<BankDetailsCardView
					v-else-if="bankDetailsDialog.data.value!.details"
					:details="bankDetailsDialog.data.value!.details"
				/>
				<div v-else class="p-4 bg-muted rounded-lg text-center">
					<span v-if="group?.users?.[bankDetailsDialog.data.value!.userId].computed.name" class="mx-0.5">
						{{ group.users[bankDetailsDialog.data.value!.userId].computed.name }}
					</span>
					<Skeleton v-else class="inline-block align-middle w-20 h-6 mx-0.5" />
					<span>has not added their bank info yet</span>
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
