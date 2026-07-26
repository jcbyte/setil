<script setup lang="ts">
import Avatar from "@/components/Avatar.vue";
import LoaderIcon from "@/components/LoaderIcon.vue";
import Button from "@/components/ui/button/Button.vue";
import Calendar from "@/components/ui/calendar/Calendar.vue";
import Card from "@/components/ui/card/Card.vue";
import CardContent from "@/components/ui/card/CardContent.vue";
import CardDescription from "@/components/ui/card/CardDescription.vue";
import CardFooter from "@/components/ui/card/CardFooter.vue";
import CardHeader from "@/components/ui/card/CardHeader.vue";
import CardTitle from "@/components/ui/card/CardTitle.vue";
import Checkbox from "@/components/ui/checkbox/Checkbox.vue";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import FieldGroup from "@/components/ui/field/FieldGroup.vue";
import InputGroup from "@/components/ui/input-group/InputGroup.vue";
import InputGroupAddon from "@/components/ui/input-group/InputGroupAddon.vue";
import InputGroupInput from "@/components/ui/input-group/InputGroupInput.vue";
import Input from "@/components/ui/input/Input.vue";
import Popover from "@/components/ui/popover/Popover.vue";
import PopoverContent from "@/components/ui/popover/PopoverContent.vue";
import PopoverTrigger from "@/components/ui/popover/PopoverTrigger.vue";
import Select from "@/components/ui/select/Select.vue";
import SelectContent from "@/components/ui/select/SelectContent.vue";
import SelectItem from "@/components/ui/select/SelectItem.vue";
import SelectTrigger from "@/components/ui/select/SelectTrigger.vue";
import SelectValue from "@/components/ui/select/SelectValue.vue";
import Skeleton from "@/components/ui/skeleton/Skeleton.vue";
import Tabs from "@/components/ui/tabs/Tabs.vue";
import TabsList from "@/components/ui/tabs/TabsList.vue";
import TabsTrigger from "@/components/ui/tabs/TabsTrigger.vue";
import UserSelect from "@/components/UserSelect.vue";
import { useCurrentUser } from "@/composables/useCurrentUser";
import type { GroupWithUserPublic } from "@/composables/useLiveGroupWithUserPublic";
import type { Transaction, TransactionCategory } from "@/firebase/types";
import { CategorySettings } from "@/util/category";
import { CurrencySettings, formatCurrency, toFirestoreAmount } from "@/util/currency";
import { splitAmountEven, splitAmountRatio } from "@/util/split";
import { getStatusUsers } from "@/util/util";
import { CalendarDate, DateFormatter, getLocalTimeZone, today, type DateValue } from "@internationalized/date";
import { CalendarIcon, Plus, Save } from "@lucide/vue";
import { toTypedSchema } from "@vee-validate/zod";
import { Timestamp } from "firebase/firestore";
import { toDate } from "reka-ui/date";
import { useForm, Field as VeeField } from "vee-validate";
import { computed } from "vue";
import * as z from "zod";

const props = defineProps<{
	newTransaction: boolean;
	group: GroupWithUserPublic | null;
	updating?: boolean;
	initialLoading?: boolean;
}>();
const emit = defineEmits<{
	submit: [details: Transaction];
}>();

const formSchema = z.object({
	title: z.string().min(1, "Title is required").max(100, "Title cannot exceed 100 characters"),
	amount: z // Must do all validation within refine, as we require no validation when values.to === "unequal"
		.any()
		.optional()
		.refine((val) => {
			if (values.to?.type === "unequal") return true;
			return val && typeof val === "number" && val > 0;
		}, "An amount is required"),
	date: z.custom<DateValue>().refine((v) => v, "A date is required"),
	category: z.string().refine((val) => Object.keys(CategorySettings).includes(val), "Must select a valid category"),
	from: z
		.string()
		.refine((val) => props.group?.users && Object.keys(props.group.users).includes(val), "Must select a valid member"),
	to: z
		.object({
			type: z.enum(["equal", "unequal", "ratio"]).default("equal"),
			people: z
				.record(
					z.string(),
					z.object({
						selected: z.boolean(),
						num: z.number().optional(),
					}),
				)
				.refine((v) => Object.values(v).some((vo) => vo.selected), "Must select at least one recipient"),
		})
		.refine(
			(v) => v.type === "equal" || !Object.values(v.people).some((vo) => vo.selected && !vo.num),
			"An amount is required for a selected member",
		),
});
const typedFormSchema = toTypedSchema(formSchema);
export type TransactionDetailsValues = z.infer<typeof formSchema>;

const currentUser = useCurrentUser();

const { handleSubmit, resetForm, setFieldValue, values, meta, validateField } = useForm({
	validationSchema: typedFormSchema,
	initialValues: {
		date: today(getLocalTimeZone()),
		category: "expense",
		from: currentUser.value?.uid,
		to: {
			type: "equal",
		},
	},
});

const currencySetting = computed(() =>
	props.group?.data?.currency ? CurrencySettings[props.group.data.currency] : null,
);

const activeUsers = computed(() => getStatusUsers(props.group?.users ?? {}, new Set(["active"])));

const df = new DateFormatter(navigator.language, { dateStyle: "long" });

function resolveBalances(): Record<string, number> | null {
	if (!props.group?.data || !values.to?.type || !values.to.people) return null;

	const selectedUsers = Object.entries(values.to.people).filter(([, userData]) => userData?.selected);

	switch (values.to.type) {
		case "equal":
			if (!values.amount) return null;
			return splitAmountEven(
				toFirestoreAmount(values.amount, props.group.data.currency),
				selectedUsers.map(([userId]) => userId),
			);

		case "unequal":
			if (selectedUsers.some(([_, userData]) => userData?.num === undefined)) return null;
			return Object.fromEntries(
				selectedUsers.map(([userId, userData]) => [
					userId,
					toFirestoreAmount(userData!.num!, props.group!.data!.currency),
				]),
			);

		case "ratio":
			if (!values.amount) return null;
			if (selectedUsers.some(([_, userData]) => userData?.num === undefined)) return null;
			return splitAmountRatio(
				toFirestoreAmount(values.amount, props.group.data.currency),
				Object.fromEntries(selectedUsers.map(([userId, userData]) => [userId, userData!.num!])),
			);
	}
}

const splitValue = computed(resolveBalances);

const allSelected = computed<boolean>(
	() => !Object.keys(activeUsers.value).some((userId) => !values.to?.people?.[userId]?.selected),
);

const onSubmit = handleSubmit((values) => {
	let resolvedBalances = resolveBalances();
	if (!resolvedBalances) return;

	const transaction: Transaction = {
		title: values.title,
		from: values.from,
		date: Timestamp.fromDate(values.date.toDate(getLocalTimeZone())),
		to: resolvedBalances,
		category: values.category as TransactionCategory,
	};
	console.log(transaction);

	emit("submit", transaction);
});

export type TransactionDetailsFormExposed = {
	reset: (values: Partial<TransactionDetailsValues>) => void;
};
defineExpose<TransactionDetailsFormExposed>({
	reset: (values) => resetForm({ values }),
});
</script>

<template>
	<Card>
		<CardHeader>
			<CardTitle>Expense Details</CardTitle>
			<CardDescription>
				{{ newTransaction ? "Add a new expense to your group" : "Update details of this expense" }}
			</CardDescription>
		</CardHeader>
		<CardContent>
			<form id="transaction-details-form" @submit="onSubmit">
				<FieldGroup>
					<VeeField v-slot="{ componentField, errors }" name="title">
						<Field :data-invalid="!!errors.length">
							<FieldLabel for="title">Title</FieldLabel>
							<Input
								v-if="!initialLoading"
								id="title"
								type="text"
								v-bind="componentField"
								placeholder="What was this expense for?"
								:disabled="updating"
							/>
							<Skeleton v-else class="w-full h-9" />
							<FieldError v-if="errors.length" :errors="errors" />
						</Field>
					</VeeField>

					<div class="flex items-start gap-2">
						<VeeField v-slot="{ componentField, errors }" name="amount">
							<Field :data-invalid="!!errors.length">
								<FieldLabel for="amount">Amount</FieldLabel>
								<InputGroup v-if="!initialLoading">
									<InputGroupInput
										id="amount"
										type="number"
										:placeholder="(12.3).toFixed(currencySetting?.decimals ?? 2)"
										:step="Math.pow(10, -(currencySetting?.decimals ?? 2))"
										:disabled="updating || values.to?.type === 'unequal'"
										v-bind="componentField"
									/>
									<InputGroupAddon v-if="currencySetting">
										{{ currencySetting.symbol }}
									</InputGroupAddon>
								</InputGroup>
								<Skeleton v-else class="w-full h-9" />
								<FieldError v-if="errors.length" :errors="errors" />
							</Field>
						</VeeField>

						<VeeField v-slot="{ componentField, value, errors }" name="date">
							<Field :data-invalid="!!errors.length">
								<FieldLabel for="date">Date</FieldLabel>
								<Popover>
									<PopoverTrigger as-child>
										<Button
											variant="outline"
											id="date"
											:class="`w-full font-normal ${!value && 'text-muted-foreground'}`"
											:disabled="updating"
										>
											<span>{{ value ? df.format(toDate(value)) : "Pick a date" }}</span>
											<CalendarIcon class="ms-auto h-4 w-4 opacity-50" />
										</Button>
									</PopoverTrigger>
									<PopoverContent>
										<Calendar
											v-bind="componentField"
											:min-value="new CalendarDate(1900, 1, 1)"
											:max-value="today(getLocalTimeZone())"
										/>
									</PopoverContent>
								</Popover>
								<FieldError v-if="errors.length" :errors="errors" />
							</Field>
						</VeeField>
					</div>

					<VeeField v-slot="{ componentField, errors }" name="category">
						<!-- todo could this be a horizontal radio group of icons? Could look nicer -->
						<Field :data-invalid="!!errors.length">
							<FieldLabel for="category">Category</FieldLabel>
							<Select v-if="!initialLoading" v-bind="componentField" :disabled="updating">
								<SelectTrigger id="category">
									<SelectValue placeholder="Expense" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem v-for="(category, categoryId) in CategorySettings" :value="categoryId">
										<div class="flex items-center gap-2">
											<div class="bg-secondary rounded-lg size-6 flex justify-center items-center">
												<component :is="category.icon" class="size-4" />
											</div>
											<span>{{ category.name }}</span>
										</div>
									</SelectItem>
								</SelectContent>
							</Select>
							<Skeleton v-else class="w-full h-9" />
							<FieldError v-if="errors.length" :errors="errors" />
						</Field>
					</VeeField>

					<VeeField v-slot="{ componentField, errors }" name="from">
						<Field :data-invalid="!!errors.length">
							<FieldLabel for="from">Paid By</FieldLabel>
							<UserSelect
								v-if="!initialLoading"
								v-bind="componentField"
								id="from"
								:users="activeUsers"
								:selected-user="values.from"
								:disabled="updating"
							/>
							<Skeleton v-else class="w-full h-9" />
							<FieldError v-if="errors.length" :errors="errors" />
						</Field>
					</VeeField>

					<VeeField v-slot="{ errors }" name="to">
						<Field :data-invalid="!!errors.length">
							<FieldLabel>Split with</FieldLabel>
							<div class="flex flex-col gap-2">
								<Tabs
									:model-value="values.to?.type"
									@update:model-value="
										(v) => {
											setFieldValue('to.type', v as TransactionDetailsValues['to']['type'], false);
											validateField('to');
										}
									"
								>
									<TabsList class="grid grid-cols-3 w-full">
										<TabsTrigger value="equal" :disabled="updating">Equal</TabsTrigger>
										<TabsTrigger value="unequal" :disabled="updating">Unequal</TabsTrigger>
										<TabsTrigger value="ratio" :disabled="updating">Ratio</TabsTrigger>
									</TabsList>
								</Tabs>
								<div class="flex flex-col gap-2 bg-muted p-2 rounded-lg">
									<div
										class="grid grid-cols-[max-content_minmax(0,1fr)_minmax(0,1fr)_max-content] items-center gap-2 gap-x-3"
									>
										<template v-for="(user, userId) in activeUsers">
											<Checkbox
												class="col-start-1 size-5"
												:id="`user-${userId}`"
												:model-value="values.to?.people?.[userId]?.selected ?? false"
												@update:modelValue="
													(v) => {
														setFieldValue(`to.people.${userId}.selected`, Boolean(v), false);
														validateField('to');
													}
												"
												:disabled="updating"
											/>

											<label :for="`user-${userId}`" class="flex items-center gap-1.5 min-h-9">
												<Avatar
													v-if="user.computed.name"
													:src="user.public?.photoUrl ?? null"
													:name="user.computed.name"
													:class="`size-6 ${user.status !== 'active' && 'opacity-70'}`"
												/>
												<Skeleton v-else class="size-6 rounded-full" />
												<span
													v-if="user.computed.name"
													:class="`text-sm text-nowrap ${user.status !== 'active' && 'text-muted-foreground'}`"
												>
													{{ user.computed.name }}
												</span>
												<Skeleton v-else class="w-18 h-5" />
											</label>

											<div
												v-if="values.to?.type === 'equal' || values.to?.type === 'ratio'"
												:class="`${values.to?.type === 'equal' ? 'col-start-4' : 'col-start-3'} text-right`"
											>
												<span v-if="group?.data" class="text-sm text-muted-foreground">
													{{ formatCurrency(splitValue?.[userId] ?? 0, group.data.currency) }}
												</span>
												<Skeleton v-else class="w-16 h-5" />
											</div>

											<div
												v-if="values.to?.type === 'unequal' || values.to?.type === 'ratio'"
												:class="`col-start-4 relative items-center ${values.to?.type === 'unequal' ? 'w-28 sm:w-42' : 'w-16 sm:w-20'}`"
											>
												<InputGroup>
													<InputGroupInput
														type="number"
														:model-value="values.to?.people?.[userId]?.num"
														@update:modelValue="
															(v) => {
																setFieldValue(`to.people.${userId}.num`, v !== '' ? Number(v) : undefined, false);
																validateField('to');
															}
														"
														:placeholder="
															values.to?.type === 'unequal' ? (12.3).toFixed(currencySetting?.decimals ?? 2) : 4
														"
														:step="values.to?.type === 'unequal' ? Math.pow(10, -(currencySetting?.decimals ?? 2)) : 1"
														:disabled="updating || !values.to?.people?.[userId]?.selected"
													/>
													<InputGroupAddon v-if="values.to?.type === 'unequal' && currencySetting">
														{{ currencySetting.symbol }}
													</InputGroupAddon>
												</InputGroup>
											</div>
										</template>
									</div>
									<Button
										variant="outline"
										@click="
											() => {
												const targetValue = !allSelected;
												Object.keys(activeUsers).forEach((userId) => {
													setFieldValue(`to.people.${userId}.selected`, targetValue, false);
												});
												validateField('to');
											}
										"
										class="w-full"
									>
										{{ allSelected ? "Deselect All" : "Select All" }}
									</Button>
								</div>
							</div>
							<FieldError v-if="errors.length" :errors="errors" />
						</Field>
					</VeeField>
				</FieldGroup>
			</form>
		</CardContent>
		<CardFooter>
			<Button
				type="submit"
				form="transaction-details-form"
				:disabled="updating || !meta.valid || !meta.dirty || initialLoading"
			>
				<LoaderIcon :icon="newTransaction ? Plus : Save" :loading="updating" />
				<span>{{ newTransaction ? "Add Expense" : "Save Changes" }}</span>
			</Button>
		</CardFooter>
	</Card>
</template>
