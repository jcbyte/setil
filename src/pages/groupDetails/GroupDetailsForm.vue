<script setup lang="ts">
import LoaderIcon from "@/components/LoaderIcon.vue";
import { Button } from "@/components/ui/button";
import Card from "@/components/ui/card/Card.vue";
import CardContent from "@/components/ui/card/CardContent.vue";
import CardDescription from "@/components/ui/card/CardDescription.vue";
import CardFooter from "@/components/ui/card/CardFooter.vue";
import CardHeader from "@/components/ui/card/CardHeader.vue";
import CardTitle from "@/components/ui/card/CardTitle.vue";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Skeleton from "@/components/ui/skeleton/Skeleton.vue";
import { Textarea } from "@/components/ui/textarea";
import type { Currency } from "@/firebase/types";
import { CurrencySettings } from "@/util/currency";
import { Plus, Save } from "@lucide/vue";
import { toTypedSchema } from "@vee-validate/zod";
import { useForm, Field as VeeField } from "vee-validate";
import { watch } from "vue";
import * as z from "zod";

export type GroupDetailsValues = {
	name: string;
	description?: string;
	currency: Currency;
};

const props = defineProps<{
	newGroup: boolean;
	updating?: boolean;
	initialLoading?: boolean;
	initialValues?: Partial<GroupDetailsValues>;
}>();
const emit = defineEmits<{
	submit: [details: GroupDetailsValues];
}>();

const formSchema = toTypedSchema(
	z.object({
		name: z.string().min(1, "Group name is required").max(50, "Group name cannot exceed 50 characters"),
		description: z.string().optional(),
		currency: z.string().refine((val) => Object.keys(CurrencySettings).includes(val), "Must select a valid currency"),
	}),
);

const { handleSubmit, resetForm, meta } = useForm({
	validationSchema: formSchema,
});

const onSubmit = handleSubmit(async (values) => {
	emit("submit", values as GroupDetailsValues);
});

watch(
	() => props.initialValues,
	(values) => {
		if (values) resetForm({ values });
	},
	{ immediate: true },
);
</script>

<template>
	<Card>
		<CardHeader>
			<CardTitle>Group Details</CardTitle>
			<CardDescription>
				{{ newGroup ? "Enter your new groups information" : "Update your group information" }}
			</CardDescription>
		</CardHeader>
		<CardContent>
			<form id="group-details-form" class="flex flex-col gap-4" @submit="onSubmit">
				<FieldGroup class="gap-5">
					<VeeField v-slot="{ componentField, errors }" name="name">
						<Field :data-invalid="!!errors.length">
							<FieldLabel for="name">Group Name</FieldLabel>
							<Input
								v-if="!initialLoading"
								id="name"
								type="text"
								v-bind="componentField"
								placeholder="Germany Trip"
								:disabled="updating"
							/>
							<Skeleton v-else class="w-full h-9" />
							<FieldError v-if="errors" :errors="errors" />
						</Field>
					</VeeField>

					<VeeField v-slot="{ componentField, errors }" name="description">
						<Field :data-invalid="!!errors.length">
							<FieldLabel for="description">Description</FieldLabel>
							<Textarea
								v-if="!initialLoading"
								id="description"
								v-bind="componentField"
								placeholder="Expenses for Munich Trip."
								:disabled="updating"
							/>
							<Skeleton v-else class="w-full h-16" />
							<FieldError v-if="errors" :errors="errors" />
						</Field>
					</VeeField>

					<VeeField v-slot="{ componentField, errors }" name="currency">
						<Field :data-invalid="!!errors.length">
							<FieldLabel for="currency">Currency</FieldLabel>
							<Select v-if="!initialLoading" v-bind="componentField" :disabled="updating">
								<SelectTrigger id="currency">
									<SelectValue placeholder="Euro (€)" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem v-for="(currency, currencyId) in CurrencySettings" :value="currencyId">
										{{ currency.name }} ({{ currency.symbol.trim() }})
									</SelectItem>
								</SelectContent>
							</Select>
							<Skeleton v-else class="w-full h-9" />
							<FieldError v-if="errors.length" :errors="errors" />
						</Field>
					</VeeField>
				</FieldGroup>
			</form>
		</CardContent>

		<CardFooter>
			<Field orientation="horizontal">
				<Button
					type="submit"
					form="group-details-form"
					:disabled="updating || !meta.valid || !meta.dirty || initialLoading"
					class="w-fit place-self-end"
				>
					<LoaderIcon :icon="newGroup ? Plus : Save" :loading="updating" />
					<span>{{ newGroup ? "Create Group" : "Save Changes" }}</span>
				</Button>
			</Field>
		</CardFooter>
	</Card>
</template>
