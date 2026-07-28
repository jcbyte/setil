<script setup lang="ts">
import Avatar from "@/components/Avatar.vue";
import LoaderIcon from "@/components/LoaderIcon.vue";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UserSelect from "@/components/UserSelect.vue";
import { useCurrentUser } from "@/composables/useCurrentUser";
import type { GroupUserDataWithPublic, GroupWithUserPublic } from "@/composables/useLiveGroupWithUserPublic";
import type { Transaction, TransactionCategory } from "@/types/firestore";
import { CategorySettings } from "@/util/category";
import { splitAmountEven, splitAmountRatio } from "@/util/split";
import {
	CalendarDate,
	DateFormatter,
	getLocalTimeZone,
	now,
	parseTime,
	Time,
	toCalendarDate,
	toCalendarDateTime,
	today,
	type DateValue,
} from "@internationalized/date";
import { CalendarIcon, Clock, Plus, Save } from "@lucide/vue";
import { CurrencySettings, formatCurrency, toFirestoreAmount } from "@shared/currency";
import { toTypedSchema } from "@vee-validate/zod";
import { Timestamp } from "firebase/firestore";
import { toDate } from "reka-ui/date";
import { useForm, Field as VeeField } from "vee-validate";
import { computed } from "vue";
import * as z from "zod";

const props = defineProps<{
	newTransaction: boolean;
	group: GroupWithUserPublic | null;
	shownUsers: Record<string, GroupUserDataWithPublic>;
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
	time: z
		.string()
		.regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Please enter a valid time (HH:mm)")
		.transform(parseTime),
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
			(v) =>
				v.type === "equal" ||
				Object.values(v.people).every((vo) => !vo.selected || (vo.num !== undefined && vo.num > 0)),
			"An amount is required for a selected member",
		),
});
const typedFormSchema = toTypedSchema(formSchema);
export type TransactionDetailsValues = z.infer<typeof formSchema>;

const currentUser = useCurrentUser();
const timeNow = now(getLocalTimeZone());

const { handleSubmit, resetForm, setFieldValue, values, meta, validateField } = useForm({
	validationSchema: typedFormSchema,
	initialValues: {
		date: toCalendarDate(timeNow),
		time: new Time(timeNow.hour, timeNow.minute).toString().slice(0, 5),
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
	() => !Object.keys(props.shownUsers).some((userId) => !values.to?.people?.[userId]?.selected),
);

const onSubmit = handleSubmit((values) => {
	let resolvedBalances = resolveBalances();
	if (!resolvedBalances) return;

	const transaction: Transaction = {
		title: values.title,
		from: values.from,
		date: Timestamp.fromDate(toCalendarDateTime(values.date, values.time).toDate(getLocalTimeZone())),
		to: resolvedBalances,
		category: values.category as TransactionCategory,
	};

	emit("submit", transaction);
});

export type TransactionDetailsFormExposed = {
	reset: (values: Partial<z.input<typeof formSchema>>) => void;
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
					</div>

					<div class="flex items-start gap-2">
						<VeeField v-slot="{ componentField, value, errors }" name="date">
							<Field :data-invalid="!!errors.length">
								<FieldLabel for="date">Date</FieldLabel>
								<Popover v-if="!initialLoading">
									<PopoverTrigger as-child>
										<Button
											type="button"
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
								<Skeleton v-else class="w-full h-9" />
								<FieldError v-if="errors.length" :errors="errors" />
							</Field>
						</VeeField>

						<VeeField v-slot="{ componentField, errors }" name="time">
							<Field :data-invalid="!!errors.length">
								<FieldLabel for="time">Time</FieldLabel>
								<InputGroup v-if="!initialLoading">
									<InputGroupInput
										id="time"
										type="time"
										placeholder="10:30"
										:step="60"
										:disabled="updating"
										v-bind="componentField"
										class="[&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
									/>
									<InputGroupAddon align="inline-end">
										<Clock />
									</InputGroupAddon>
								</InputGroup>
								<Skeleton v-else class="w-full h-9" />
								<FieldError v-if="errors.length" :errors="errors" />
							</Field>
						</VeeField>
					</div>

					<VeeField v-slot="{ componentField, errors }" name="from">
						<Field :data-invalid="!!errors.length">
							<FieldLabel for="from">Paid By</FieldLabel>
							<UserSelect
								v-if="!initialLoading"
								v-bind="componentField"
								id="from"
								:users="shownUsers"
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
									v-if="!initialLoading"
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
								<Skeleton v-else class="w-full h-9" />

								<div v-if="!initialLoading" class="flex flex-col gap-2 bg-muted p-2 sm:p-4 rounded-lg">
									<div
										class="grid grid-cols-[max-content_minmax(0,1fr)_max-content_max-content] items-center gap-2 gap-x-3"
									>
										<template v-if="group?.users" v-for="(user, userId) in shownUsers">
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

											<label :for="`user-${userId}`" class="flex min-w-0 items-center gap-1.5 min-h-9">
												<Avatar
													v-if="user.computed.name"
													:src="user.public?.photoUrl ?? null"
													:name="user.computed.name"
													:class="`size-6 ${user.status !== 'active' && 'opacity-70'}`"
												/>
												<Skeleton v-else class="size-6 rounded-full" />
												<span
													v-if="user.computed.name"
													:class="`text-sm ${user.status !== 'active' && 'text-muted-foreground'} truncate`"
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
										<Skeleton v-else v-for="_ in 3" class="col-span-full h-9" />
									</div>
									<Button
										type="button"
										variant="outline"
										@click="
											() => {
												const targetValue = !allSelected;
												Object.keys(shownUsers).forEach((userId) => {
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
								<Skeleton v-else class="w-full h-42" />
							</div>
							<FieldError v-if="errors.length" :errors="errors" />
						</Field>
					</VeeField>
				</FieldGroup>
			</form>
		</CardContent>
		<CardFooter class="justify-end">
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
