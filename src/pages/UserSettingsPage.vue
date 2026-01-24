<script setup lang="ts">
import LoaderIcon from "@/components/LoaderIcon.vue";
import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import YourAccountSettings from "@/components/YourAccountSettings.vue";
import { getPaymentDetails, setPaymentDetails } from "@/firebase/firestore/user";
import { getUser } from "@/firebase/firestore/util";
import { BankingSystemSettings, type PaymentDetails } from "@/util/paymentDetails";
import { toTypedSchema } from "@vee-validate/zod";
import { ArrowLeft, CircleX, Save } from "lucide-vue-next";
import { useForm } from "vee-validate";
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import * as z from "zod";

const router = useRouter();
const { toast } = useToast();

const isDetailsUpdating = ref<boolean>(false);
const isInitialLoading = ref<boolean>(true);

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
		})
);

const { isFieldDirty, handleSubmit, setValues, values } = useForm({
	validationSchema: formSchema,
});

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
			false
		);
	}

	isInitialLoading.value = false;
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

		toast({ title: "Details Updated", description: "The universe may now shower me with funds.", duration: 5000 });
	} catch (e) {
		toast({ title: "Error Updating Details", description: String(e), variant: "destructive", duration: 5000 });
	}

	isDetailsUpdating.value = false;
});

async function clearDetails() {
	isDetailsUpdating.value = true;

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
		false
	);

	try {
		await setPaymentDetails(null);
		toast({ title: "Details Cleared", description: "Poof! My payment info has vanished.", duration: 5000 });
	} catch (e) {
		toast({ title: "Error Clearing Details", description: String(e), variant: "destructive", duration: 5000 });
	}

	isDetailsUpdating.value = false;
}
</script>

<template>
	<div>
		<div class="w-full flex flex-col gap-4 items-center">
			<div class="w-full flex justify-between items-center">
				<div class="flex gap-2 justify-center items-center">
					<Button variant="ghost" class="size-9" @click="router.back()">
						<ArrowLeft class="!size-6" />
					</Button>
					<span class="text-lg font-semibold">User Settings</span>
				</div>
				<YourAccountSettings />
			</div>

			<div class="w-full max-w-[32rem] flex flex-col gap-4">
				<div class="border border-border rounded-lg flex flex-col gap-6 p-4">
					<div class="flex flex-col">
						<span class="text-lg font-semibold">Payment Details</span>
						<span class="text-sm text-muted-foreground">How you want people to pay you</span>
					</div>

					<form class="flex flex-col gap-4" @submit="onSubmit">
						<Skeleton v-if="isInitialLoading" class="rounded-lg h-[300px] w-full" />
						<div v-else class="flex flex-col gap-2">
							<FormField v-slot="{ componentField }" name="system" :validate-on-blur="!isFieldDirty">
								<FormItem>
									<FormLabel>Banking System</FormLabel>
									<Select v-bind="componentField" :disabled="isDetailsUpdating">
										<FormControl>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											<SelectItem
												v-for="(bankingSystem, bankingSystemId) in BankingSystemSettings"
												:value="bankingSystemId"
											>
												{{ bankingSystem.name }}
											</SelectItem>
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							</FormField>

							<FormField v-slot="{ componentField }" name="name" :validate-on-blur="!isFieldDirty">
								<FormItem>
									<FormLabel>Name</FormLabel>
									<FormControl>
										<Input
											autocomplete="off"
											type="text"
											placeholder="John Smith"
											:disabled="isDetailsUpdating"
											v-bind="componentField"
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							</FormField>

							<div v-if="values.system === 'UK'">
								<FormField v-slot="{ componentField }" name="UK_sortCode" :validate-on-blur="!isFieldDirty">
									<FormItem>
										<FormLabel>Sort Code</FormLabel>
										<FormControl>
											<Input
												autocomplete="off"
												type="text"
												placeholder="12-34-56"
												:disabled="isDetailsUpdating"
												v-bind="componentField"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								</FormField>

								<FormField v-slot="{ componentField }" name="UK_accountNumber" :validate-on-blur="!isFieldDirty">
									<FormItem>
										<FormLabel>Account Number</FormLabel>
										<FormControl>
											<Input
												autocomplete="off"
												type="text"
												placeholder="12345678"
												:disabled="isDetailsUpdating"
												v-bind="componentField"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								</FormField>
							</div>
							<div v-else-if="values.system === 'US'">
								<FormField v-slot="{ componentField }" name="US_routingNumber" :validate-on-blur="!isFieldDirty">
									<FormItem>
										<FormLabel>Routing Number</FormLabel>
										<FormControl>
											<Input
												autocomplete="off"
												type="text"
												placeholder="123456789"
												:disabled="isDetailsUpdating"
												v-bind="componentField"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								</FormField>

								<FormField v-slot="{ componentField }" name="US_accountNumber" :validate-on-blur="!isFieldDirty">
									<FormItem>
										<FormLabel>Account Number</FormLabel>
										<FormControl>
											<Input
												autocomplete="off"
												type="text"
												placeholder="1234567890"
												:disabled="isDetailsUpdating"
												v-bind="componentField"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								</FormField>
							</div>
							<div v-else-if="values.system === 'SEPA'">
								<FormField v-slot="{ componentField }" name="SEPA_IBAN" :validate-on-blur="!isFieldDirty">
									<FormItem>
										<FormLabel>IBAN</FormLabel>
										<FormControl>
											<Input
												autocomplete="off"
												type="text"
												placeholder="DE89370400440532013000"
												:disabled="isDetailsUpdating"
												v-bind="componentField"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								</FormField>

								<FormField v-slot="{ componentField }" name="SEPA_BIC" :validate-on-blur="!isFieldDirty">
									<FormItem>
										<FormLabel>BIC / SWIFT Code (Optional)</FormLabel>
										<FormControl>
											<Input
												autocomplete="off"
												type="text"
												placeholder="DEUTDEFF"
												:disabled="isDetailsUpdating"
												v-bind="componentField"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								</FormField>
							</div>
							<div v-else-if="values.system === 'SWIFT'">
								<FormField v-slot="{ componentField }" name="SWIFT_SWIFT" :validate-on-blur="!isFieldDirty">
									<FormItem>
										<FormLabel>BIC / SWIFT Code</FormLabel>
										<FormControl>
											<Input
												autocomplete="off"
												type="text"
												placeholder="DEUTDEFF"
												:disabled="isDetailsUpdating"
												v-bind="componentField"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								</FormField>

								<FormField v-slot="{ componentField }" name="SWIFT_IBAN" :validate-on-blur="!isFieldDirty">
									<FormItem>
										<FormLabel>Account Number / IBAN</FormLabel>
										<FormControl>
											<Input
												autocomplete="off"
												type="text"
												placeholder="1234567890"
												:disabled="isDetailsUpdating"
												v-bind="componentField"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								</FormField>

								<FormField v-slot="{ componentField }" name="SWIFT_bankName" :validate-on-blur="!isFieldDirty">
									<FormItem>
										<FormLabel>Bank Name (Optional)</FormLabel>
										<FormControl>
											<Input
												autocomplete="off"
												type="text"
												placeholder="Joel's Bank"
												:disabled="isDetailsUpdating"
												v-bind="componentField"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								</FormField>

								<FormField v-slot="{ componentField }" name="SWIFT_bankAddress" :validate-on-blur="!isFieldDirty">
									<FormItem>
										<FormLabel>Bank Address (Optional)</FormLabel>
										<FormControl>
											<Input
												autocomplete="off"
												type="text"
												placeholder="270 Park Avenue, New York, NY 10017"
												:disabled="isDetailsUpdating"
												v-bind="componentField"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								</FormField>
							</div>
						</div>

						<div class="flex gap-2 justify-between items-center">
							<Button
								type="button"
								:disabled="isDetailsUpdating || isInitialLoading"
								variant="outline"
								class="w-fit place-self-end"
								@click="clearDetails()"
							>
								<LoaderIcon :icon="CircleX" :loading="isDetailsUpdating" />
								<span>Clear Details</span>
							</Button>
							<Button type="submit" :disabled="isDetailsUpdating || isInitialLoading" class="w-fit place-self-end">
								<LoaderIcon :icon="Save" :loading="isDetailsUpdating" />
								<span>Save</span>
							</Button>
						</div>
					</form>
				</div>
			</div>
		</div>
	</div>
</template>
