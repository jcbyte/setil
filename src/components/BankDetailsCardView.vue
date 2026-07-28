<script setup lang="ts">
import type { PaymentDetails } from "@/types/paymentDetails";
import { computed } from "vue";
import CopyButton from "./CopyButton.vue";

const props = defineProps<{
	details: PaymentDetails;
}>();

const presentation = computed<{ title: string; rows: { label: string; value: string | null }[] }>(() => {
	switch (props.details.type) {
		case "UK":
			return {
				title: "UK Bank Account",
				rows: [
					{ label: "Name", value: props.details.name },
					{ label: "Sort Code", value: props.details.sortCode },
					{ label: "Account Number", value: props.details.accountNumber },
				],
			};

		case "US":
			return {
				title: "US Bank Account",
				rows: [
					{ label: "Account Name", value: props.details.name },
					{ label: "Routing Number", value: props.details.routingNumber },
					{ label: "Account Number", value: props.details.accountNumber },
				],
			};

		case "SEPA":
			return {
				title: "SEPA Details",
				rows: [
					{ label: "Account Name", value: props.details.name },
					{ label: "IBAN", value: props.details.IBAN },
					{ label: "BIC / SWIFT Code", value: props.details.BIC },
				],
			};

		case "SWIFT":
			return {
				title: "SWIFT Details",
				rows: [
					{ label: "Account Name", value: props.details.name },
					{ label: "BIC / SWIFT Code", value: props.details.SWIFT },
					{ label: "Account Number / IBAN", value: props.details.IBAN },
					{ label: "Bank Name", value: props.details.bankName },
					{ label: "Bank Address", value: props.details.bankAddress },
				],
			};

		default:
			return {
				title: "Unsupported Bank Account Details",
				rows: [],
			};
	}
});
</script>

<template>
	<div class="bg-muted rounded-lg py-2">
		<div class="mb-3 text-center font-medium">
			{{ presentation.title }}
		</div>

		<div class="border-t px-4">
			<template v-for="row in presentation.rows" :key="`${details.type}-${row.label}`">
				<div
					v-if="row.value"
					class="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2 border-b py-1 last:border-b-0"
				>
					<span class="pl-2 text-sm text-muted-foreground">
						{{ row.label }}
					</span>
					<span class="text-sm text-right">
						{{ row.value }}
					</span>
					<CopyButton class="pr-2" :text="row.value" />
				</div>
			</template>
		</div>
	</div>
</template>
