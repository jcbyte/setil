<script setup lang="ts">
import LoaderIcon from "@/components/LoaderIcon.vue";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import CardDescription from "@/components/ui/card/CardDescription.vue";
import CardFooter from "@/components/ui/card/CardFooter.vue";
import CardTitle from "@/components/ui/card/CardTitle.vue";
import { Field, FieldLabel } from "@/components/ui/field";
import FieldError from "@/components/ui/field/FieldError.vue";
import FieldGroup from "@/components/ui/field/FieldGroup.vue";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import YourAccountSettings from "@/components/YourAccountSettings.vue";
import { getPaymentDetails, removePaymentDetails, setPaymentDetails } from "@/firebase/firestore/user";
import { getUser } from "@/firebase/firestore/util";
import { BankingSystemSettings, type PaymentDetails } from "@/util/paymentDetails";
import { ArrowLeft, CircleX, Save } from "@lucide/vue";
import { toTypedSchema } from "@vee-validate/zod";
import { useForm, Field as VeeField } from "vee-validate";
import { onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { toast } from "vue-sonner";
import * as z from "zod";

const router = useRouter();

const hasDataLoaded = ref<boolean>(false);

const isDetailsUpdating = ref<boolean>(false);
const isDetailsClearing = ref<boolean>(false);

const formSchema = toTypedSchema(
	z
		.object({
			system: z
				.string()
				.refine((val) => Object.keys(BankingSystemSettings).includes(val), "Must select a valid banking system"),
			name: z.string().min(1, "Name is required"),
			// UK
			UK_sortCode: z
				.string()
				.regex(/^(?:\d{2}[- ]?\d{2}[- ]?\d{2})$/, "Invalid Sort code format")
				.optional(),
			UK_accountNumber: z
				.string()
				.length(8, "Account number must be 8 digits")
				.regex(/^\d+$/, "Account number must contain digits only")
				.optional(),
			// US
			US_routingNumber: z
				.string()
				.length(9, "Routing number must be 9 digits")
				.regex(/^\d+$/, "Routing number must contain digits only")
				.optional(),
			US_accountNumber: z
				.string()
				.min(8, "Account number must be at least 8 digits")
				.max(17, "Account number must not be longer than 17 digits")
				.regex(/^\d+$/, "Account number must contain digits only")
				.optional(),
			// SEPA
			SEPA_IBAN: z.string().optional(),
			SEPA_BIC: z.string().optional(),
			// SWIFT
			SWIFT_SWIFT: z.string().optional(),
			SWIFT_IBAN: z.string().optional(),
			SWIFT_bankName: z.string().optional(),
			SWIFT_bankAddress: z.string().optional(),
		})
		.superRefine((data, ctx) => {
			if (data.system === "UK") {
				if (!data.UK_sortCode)
					ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["UK_sortCode"], message: "Sort Code required" });
				if (!data.UK_accountNumber)
					ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["UK_accountNumber"], message: "Account Number required" });
			} else if (data.system === "US") {
				if (!data.US_routingNumber)
					ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["US_routingNumber"], message: "Routing Number required" });
				if (!data.US_accountNumber)
					ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["US_accountNumber"], message: "Account Number required" });
			} else if (data.system === "SEPA") {
				if (!data.SEPA_IBAN)
					ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["SEPA_IBAN"], message: "IBAN required" });
			} else if (data.system === "SWIFT") {
				if (!data.SWIFT_SWIFT)
					ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["SWIFT_SWIFT"], message: "SWIFT / BIC code required" });
				if (!data.SWIFT_IBAN)
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						path: ["SWIFT_IBAN"],
						message: "Account number / IBAN required",
					});
			}
		}),
);

const { handleSubmit, setValues, values } = useForm({
	validationSchema: formSchema,
	keepValuesOnUnmount: true,
});
watch(values, (v) => console.log(v));

onMounted(async () => {
	const paymentDetails = await getPaymentDetails();

	if (paymentDetails) {
		if (paymentDetails.type === "UK") {
			setValues({
				system: "UK",
				name: paymentDetails.name,
				UK_accountNumber: paymentDetails.accountNumber,
				UK_sortCode: paymentDetails.sortCode,
			});
		} else if (paymentDetails.type === "US") {
			setValues({
				system: "US",
				name: paymentDetails.name,
				US_routingNumber: paymentDetails.routingNumber,
				US_accountNumber: paymentDetails.accountNumber,
			});
		} else if (paymentDetails.type === "SEPA") {
			setValues({
				system: "SEPA",
				name: paymentDetails.name,
				SEPA_IBAN: paymentDetails.IBAN,
				SEPA_BIC: paymentDetails.BIC ?? undefined,
			});
		} else if (paymentDetails.type === "SWIFT") {
			setValues({
				system: "SWIFT",
				name: paymentDetails.name,
				SWIFT_SWIFT: paymentDetails.SWIFT,
				SWIFT_IBAN: paymentDetails.IBAN,
				SWIFT_bankName: paymentDetails.bankName ?? undefined,
				SWIFT_bankAddress: paymentDetails.bankAddress ?? undefined,
			});
		}
	} else {
		setValues(
			{
				system: "UK",
				name: getUser().displayName ?? undefined,
			},
			false,
		);
	}

	hasDataLoaded.value = true;
});

const onSubmit = handleSubmit(async (values) => {
	isDetailsUpdating.value = true;

	try {
		let paymentDetails: PaymentDetails | null = null;
		if (values.system === "UK") {
			paymentDetails = {
				type: "UK",
				name: values.name,
				sortCode: values.UK_sortCode!,
				accountNumber: values.UK_accountNumber!,
			};
		} else if (values.system === "US") {
			paymentDetails = {
				type: "US",
				name: values.name,
				routingNumber: values.US_routingNumber!,
				accountNumber: values.US_accountNumber!,
			};
		} else if (values.system === "SEPA") {
			paymentDetails = {
				type: "SEPA",
				name: values.name,
				IBAN: values.SEPA_IBAN!,
				BIC: values.SEPA_BIC ?? null,
			};
		} else if (values.system === "SWIFT") {
			paymentDetails = {
				type: "SWIFT",
				name: values.name,
				SWIFT: values.SWIFT_SWIFT!,
				IBAN: values.SWIFT_IBAN!,
				bankName: values.SWIFT_bankName ?? null,
				bankAddress: values.SWIFT_bankAddress ?? null,
			};
		}

		await setPaymentDetails(paymentDetails);

		toast("Details Updated", { description: "The universe may now shower me with funds." });
	} catch (e) {
		toast.error("Error Updating Details", { description: String(e) });
	}

	isDetailsUpdating.value = false;
});

async function clearDetails() {
	isDetailsClearing.value = true;

	try {
		await removePaymentDetails();

		setValues(
			{
				UK_accountNumber: undefined,
				UK_sortCode: undefined,
				US_accountNumber: undefined,
				US_routingNumber: undefined,
				SEPA_BIC: undefined,
				SEPA_IBAN: undefined,
				SWIFT_IBAN: undefined,
				SWIFT_SWIFT: undefined,
				SWIFT_bankAddress: undefined,
				SWIFT_bankName: undefined,
			},
			false,
		);

		toast("Details Cleared", { description: "Poof! My payment info has vanished." });
	} catch (e) {
		toast.error("Error Clearing Details", { description: String(e) });
	}

	isDetailsClearing.value = false;
}
</script>

<template>
	<div class="mx-auto w-full max-w-2xl flex flex-col gap-4">
		<div class="flex justify-between items-center">
			<div class="flex items-center gap-1">
				<Button variant="ghost" size="icon" @click="router.push('/')">
					<ArrowLeft class="!size-5.5" />
				</Button>
				<span class="text-lg font-semibold">Payment Details</span>
			</div>
			<YourAccountSettings />
		</div>

		<Card>
			<CardHeader>
				<CardTitle>Bank Details</CardTitle>
				<CardDescription>How you want people to pay you</CardDescription>
			</CardHeader>
			<CardContent>
				<form v-if="hasDataLoaded" id="bank-details-form" @submit="onSubmit">
					<FieldGroup class="gap-5">
						<VeeField v-slot="{ componentField, errors }" name="system">
							<Field :data-invalid="!!errors.length">
								<FieldLabel for="system">Banking System</FieldLabel>
								<Select v-bind="componentField" :disabled="isDetailsUpdating || isDetailsClearing">
									<SelectTrigger id="system">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem
											v-for="(bankingSystem, bankingSystemId) in BankingSystemSettings"
											:value="bankingSystemId"
										>
											{{ bankingSystem.name }}
										</SelectItem>
									</SelectContent>
								</Select>
								<FieldError v-if="errors.length" :errors="errors" />
							</Field>
						</VeeField>

						<VeeField v-slot="{ componentField, errors }" name="name">
							<Field :data-invalid="!!errors.length">
								<FieldLabel for="name">Full Name</FieldLabel>
								<Input
									id="name"
									type="text"
									v-bind="componentField"
									placeholder="John Smith"
									:disabled="isDetailsUpdating || isDetailsClearing"
								/>
								<FieldError v-if="errors" :errors="errors" />
							</Field>
						</VeeField>

						<template v-if="values.system === 'UK'">
							<VeeField v-slot="{ componentField, errors }" name="UK_sortCode">
								<Field :data-invalid="!!errors.length">
									<FieldLabel for="UK_sortCode">Sort Code</FieldLabel>
									<Input
										id="UK_sortCode"
										type="text"
										v-bind="componentField"
										placeholder="12-34-56"
										:disabled="isDetailsUpdating || isDetailsClearing"
									/>
									<FieldError v-if="errors" :errors="errors" />
								</Field>
							</VeeField>

							<VeeField v-slot="{ componentField, errors }" name="UK_accountNumber">
								<Field :data-invalid="!!errors.length">
									<FieldLabel for="UK_accountNumber">Account Number</FieldLabel>
									<Input
										id="UK_accountNumber"
										type="text"
										v-bind="componentField"
										placeholder="12345678"
										:disabled="isDetailsUpdating || isDetailsClearing"
									/>
									<FieldError v-if="errors" :errors="errors" />
								</Field>
							</VeeField>
						</template>

						<template v-else-if="values.system === 'US'">
							<VeeField v-slot="{ componentField, errors }" name="US_routingNumber">
								<Field :data-invalid="!!errors.length">
									<FieldLabel for="US_routingNumber">Routing Number</FieldLabel>
									<Input
										id="US_routingNumber"
										type="text"
										v-bind="componentField"
										placeholder="123456789"
										:disabled="isDetailsUpdating || isDetailsClearing"
									/>
									<FieldError v-if="errors" :errors="errors" />
								</Field>
							</VeeField>

							<VeeField v-slot="{ componentField, errors }" name="US_accountNumber">
								<Field :data-invalid="!!errors.length">
									<FieldLabel for="US_accountNumber">Account Number</FieldLabel>
									<Input
										id="US_accountNumber"
										type="text"
										v-bind="componentField"
										placeholder="1234567890"
										:disabled="isDetailsUpdating || isDetailsClearing"
									/>
									<FieldError v-if="errors" :errors="errors" />
								</Field>
							</VeeField>
						</template>

						<template v-else-if="values.system === 'SEPA'">
							<VeeField v-slot="{ componentField, errors }" name="SEPA_IBAN">
								<Field :data-invalid="!!errors.length">
									<FieldLabel for="SEPA_IBAN">IBAN</FieldLabel>
									<Input
										id="SEPA_IBAN"
										type="text"
										v-bind="componentField"
										placeholder="DE89370400440532013000"
										:disabled="isDetailsUpdating || isDetailsClearing"
									/>
									<FieldError v-if="errors" :errors="errors" />
								</Field>
							</VeeField>

							<VeeField v-slot="{ componentField, errors }" name="SEPA_BIC">
								<Field :data-invalid="!!errors.length">
									<FieldLabel for="SEPA_BIC">BIC / SWIFT Code (Optional)</FieldLabel>
									<Input
										id="SEPA_BIC"
										type="text"
										v-bind="componentField"
										placeholder="DEUTDEFF"
										:disabled="isDetailsUpdating || isDetailsClearing"
									/>
									<FieldError v-if="errors" :errors="errors" />
								</Field>
							</VeeField>
						</template>

						<template v-else-if="values.system === 'SWIFT'">
							<VeeField v-slot="{ componentField, errors }" name="SWIFT_SWIFT">
								<Field :data-invalid="!!errors.length">
									<FieldLabel for="SWIFT_SWIFT">BIC / SWIFT Code</FieldLabel>
									<Input
										id="SWIFT_SWIFT"
										type="text"
										v-bind="componentField"
										placeholder="DEUTDEFF"
										:disabled="isDetailsUpdating || isDetailsClearing"
									/>
									<FieldError v-if="errors" :errors="errors" />
								</Field>
							</VeeField>

							<VeeField v-slot="{ componentField, errors }" name="SWIFT_IBAN">
								<Field :data-invalid="!!errors.length">
									<FieldLabel for="SWIFT_IBAN">Account Number / IBAN</FieldLabel>
									<Input
										id="SWIFT_IBAN"
										type="text"
										v-bind="componentField"
										placeholder="1234567890"
										:disabled="isDetailsUpdating || isDetailsClearing"
									/>
									<FieldError v-if="errors" :errors="errors" />
								</Field>
							</VeeField>

							<VeeField v-slot="{ componentField, errors }" name="SWIFT_bankName">
								<Field :data-invalid="!!errors.length">
									<FieldLabel for="SWIFT_bankName">Bank Name (Optional)</FieldLabel>
									<Input
										id="SWIFT_bankName"
										type="text"
										v-bind="componentField"
										placeholder="Joel's Bank"
										:disabled="isDetailsUpdating || isDetailsClearing"
									/>
									<FieldError v-if="errors" :errors="errors" />
								</Field>
							</VeeField>

							<VeeField v-slot="{ componentField, errors }" name="SWIFT_bankAddress">
								<Field :data-invalid="!!errors.length">
									<FieldLabel for="SWIFT_bankAddress">Bank Address (Optional)</FieldLabel>
									<Input
										id="SWIFT_bankAddress"
										type="text"
										v-bind="componentField"
										placeholder="270 Park Avenue, New York, NY 10017"
										:disabled="isDetailsUpdating || isDetailsClearing"
									/>
									<FieldError v-if="errors" :errors="errors" />
								</Field>
							</VeeField>
						</template>
					</FieldGroup>
				</form>
				<Skeleton v-else class="rounded-lg h-88 w-full" />
			</CardContent>

			<CardFooter>
				<Field orientation="horizontal">
					<Button
						type="button"
						:disabled="isDetailsUpdating || isDetailsClearing || !hasDataLoaded"
						variant="outline"
						@click="clearDetails()"
					>
						<LoaderIcon :icon="CircleX" :loading="isDetailsClearing" />
						<span>Remove</span>
					</Button>
					<Button
						type="submit"
						form="bank-details-form"
						:disabled="isDetailsUpdating || isDetailsClearing || !hasDataLoaded"
					>
						<LoaderIcon :icon="Save" :loading="isDetailsUpdating" />
						<span>Save</span>
					</Button>
				</Field>
			</CardFooter>
		</Card>
	</div>
</template>
