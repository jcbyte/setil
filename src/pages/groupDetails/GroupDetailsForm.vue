<script setup lang="ts">
import LoaderIcon from "@/components/LoaderIcon.vue";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { CurrencySettings } from "@/util/currency";
import { Plus, Save } from "@lucide/vue";
import { toTypedSchema } from "@vee-validate/zod";
import { useForm, Field as VeeField } from "vee-validate";
import * as z from "zod";

const props = defineProps<{
	newGroup: boolean;
	updating?: boolean;
	initialLoading?: boolean;
}>();
const emit = defineEmits<{
	submit: [details: GroupDetailsValues];
}>();

const formSchema = z.object({
	name: z.string().min(1, "Group name is required").max(50, "Group name cannot exceed 50 characters"),
	description: z.string().optional(),
	currency: z.string().refine((val) => Object.keys(CurrencySettings).includes(val), "Must select a valid currency"),
});
const typedFormSchema = toTypedSchema(formSchema);
export type GroupDetailsValues = z.infer<typeof formSchema>;

const { handleSubmit, resetForm, meta } = useForm({
	validationSchema: typedFormSchema,
});

const onSubmit = handleSubmit((values) => {
	emit("submit", values as GroupDetailsValues);
});

export type GroupDetailsFormExposed = {
	reset: (values: Partial<z.input<typeof formSchema>>) => void;
};
defineExpose<GroupDetailsFormExposed>({
	reset: (values) => resetForm({ values }),
});
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
							<FieldError v-if="errors.length" :errors="errors" />
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
							<FieldError v-if="errors.length" :errors="errors" />
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

		<CardFooter class="justify-end">
			<Button
				type="submit"
				form="group-details-form"
				:disabled="updating || !meta.valid || !meta.dirty || initialLoading"
			>
				<LoaderIcon :icon="newGroup ? Plus : Save" :loading="updating" />
				<span>{{ newGroup ? "Create Group" : "Save Changes" }}</span>
			</Button>
		</CardFooter>
	</Card>
</template>
