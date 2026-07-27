<script setup lang="ts">
import Avatar from "@/components/Avatar.vue";
import LoaderIcon from "@/components/LoaderIcon.vue";
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Empty from "@/components/ui/empty/Empty.vue";
import EmptyDescription from "@/components/ui/empty/EmptyDescription.vue";
import EmptyHeader from "@/components/ui/empty/EmptyHeader.vue";
import EmptyMedia from "@/components/ui/empty/EmptyMedia.vue";
import EmptyTitle from "@/components/ui/empty/EmptyTitle.vue";
import Skeleton from "@/components/ui/skeleton/Skeleton.vue";
import { useControlledDialog } from "@/composables/useControlledDialog";
import type { GroupWithUserPublic } from "@/composables/useLiveGroupWithUserPublic";
import { deleteTransaction } from "@/firebase/firestore/transaction";
import type { Transaction } from "@/firebase/types";
import { CategorySettings } from "@/util/category";
import { formatCurrency } from "@/util/currency";
import { getLeftUsersInTransaction, sumRecordValues } from "@/util/util";
import { EllipsisVertical, FilePen, FileText, Trash } from "@lucide/vue";
import { computed } from "vue";
import { useRouter } from "vue-router";
import { toast } from "vue-sonner";

const props = defineProps<{
	groupId: string;
	group: GroupWithUserPublic;
}>();

const router = useRouter();

const {
	open: deleteConfirmDialogOpen,
	processing: deleteConfirmDialogProcessing,
	openDialog: openDeleteConfirmDialog,
	startDialogProcessing: startDeleteConfirmDialogProcessing,
	closeDialog: closeDeleteConfirmDialog,
	data: deleteDialogData,
} = useControlledDialog<{ transactionId: string }>();

const sortedTransactions = computed(() => {
	if (!props.group.transactions) return [];

	return Object.entries(props.group.transactions).sort(
		([, transactionA]: [string, Transaction], [, transactionB]: [string, Transaction]) =>
			transactionB.date.seconds - transactionA.date.seconds,
	);
});

interface MonthTransactionGroup {
	monthGroup: string;
	transactions: [string, Transaction][];
}

const groupedSortedTransactions = computed(() => {
	const groups: MonthTransactionGroup[] = [];
	sortedTransactions.value.forEach(([transactionId, transaction]: [string, Transaction]) => {
		const monthGroup = transaction.date.toDate().toLocaleDateString(undefined, { month: "long", year: "numeric" });

		let lastGroup = groups[groups.length - 1];
		if (!lastGroup || lastGroup.monthGroup !== monthGroup) {
			lastGroup = { monthGroup, transactions: [] };
			groups.push(lastGroup);
		}

		lastGroup.transactions.push([transactionId, transaction]);
	});

	return groups;
});

async function handleDeleteTransaction() {
	if (!props.group.transactions) return;
	if (!props.group.users) return;

	startDeleteConfirmDialogProcessing();

	const leftUsers = getLeftUsersInTransaction(
		props.group.transactions[deleteDialogData.value!.transactionId],
		props.group.users,
	);
	try {
		await deleteTransaction(props.groupId, deleteDialogData.value!.transactionId, leftUsers);
		toast("Expense Deleted", { description: "It's like it never happened." });
	} catch (e) {
		toast.error("Error Deleting Expense", { description: String(e) });
	}

	closeDeleteConfirmDialog();
}
</script>

<template>
	<div>
		<Card>
			<CardHeader>
				<CardTitle>Group Activity</CardTitle>
				<CardDescription>Transactions in this group</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="flex flex-col gap-4">
					<template v-if="group.transactions">
						<div
							v-if="groupedSortedTransactions.length > 0"
							v-for="groupedTransactions in groupedSortedTransactions"
							class="flex flex-col gap-1"
						>
							<span class="text-sm text-muted-foreground font-semibold uppercase">
								{{ groupedTransactions.monthGroup }}
							</span>
							<div
								v-for="[transactionId, transaction] in groupedTransactions.transactions"
								class="bg-muted rounded-lg px-4 py-2 flex justify-between items-center gap-4"
							>
								<div class="flex items-center gap-2 min-w-0">
									<div class="relative flex justify-center items-center">
										<Avatar
											v-if="props.group.users && props.group.users[transaction.from].computed.name"
											:src="props.group.users[transaction.from].public?.photoUrl ?? null"
											:name="props.group.users[transaction.from].computed.name!"
										/>
										<Skeleton v-else class="size-10 rounded-full" />
										<div
											class="absolute -bottom-1 -right-1 rounded-full bg-card size-5.5 flex justify-center items-center"
										>
											<component :is="CategorySettings[transaction.category].icon" class="size-3!" />
										</div>
									</div>
									<div class="flex flex-col min-w-0">
										<span class="truncate">{{ transaction.title }}</span>
										<div class="flex items-center gap-1 min-w-0">
											<span
												v-if="props.group.users && props.group.users[transaction.from].computed.name"
												class="text-sm text-muted-foreground min-w-0 truncate"
											>
												by {{ props.group.users[transaction.from].computed.name }}
											</span>
											<Skeleton v-else class="w-18 h-5" />
										</div>
									</div>
								</div>

								<div class="flex items-center gap-2">
									<div class="flex flex-col items-end">
										<span>
											{{
												props.group.data
													? formatCurrency(sumRecordValues(transaction.to), props.group.data.currency)
													: sumRecordValues(transaction.to)
											}}
										</span>
										<span class="text-sm text-muted-foreground text-nowrap">
											{{ transaction.date.toDate().toLocaleDateString(undefined, { day: "numeric", month: "short" }) }}
										</span>
									</div>
									<DropdownMenu>
										<DropdownMenuTrigger as-child>
											<EllipsisVertical class="!size-5" />
										</DropdownMenuTrigger>
										<DropdownMenuContent>
											<RouterLink :to="`/group/${groupId}/transaction/${transactionId}`">
												<DropdownMenuItem>
													<div class="w-full flex justify-between items-center">
														<span>Edit</span>
														<FilePen class="!size-5" />
													</div>
												</DropdownMenuItem>
											</RouterLink>
											<DropdownMenuSeparator />
											<DropdownMenuItem @click="openDeleteConfirmDialog({ transactionId })">
												<div class="w-full flex justify-between items-center">
													<span class="text-red-400">Delete</span>
													<Trash class="text-red-400 !size-5" />
												</div>
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</div>
							</div>
						</div>

						<Empty v-else>
							<EmptyHeader>
								<EmptyMedia variant="icon">
									<FileText />
								</EmptyMedia>
								<EmptyTitle>No activity</EmptyTitle>
								<EmptyDescription>Create an expense to start splitting expenses</EmptyDescription>
							</EmptyHeader>
						</Empty>
					</template>
					<div v-else v-for="i in 3" class="flex flex-col gap-1">
						<Skeleton class="w-34 h-5" />
						<Skeleton v-for="_ in i * 2" class="w-full h-15" />
					</div>
				</div>
			</CardContent>
		</Card>

		<AlertDialog v-model:open="deleteConfirmDialogOpen">
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
					<AlertDialogDescription>
						This cannot be undone and will permanently delete the transaction.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter class="gap-2">
					<Button
						type="button"
						variant="outline"
						:disabled="deleteConfirmDialogProcessing"
						@click="closeDeleteConfirmDialog"
					>
						Cancel
					</Button>
					<Button
						type="button"
						variant="destructive"
						:disabled="deleteConfirmDialogProcessing"
						@click="handleDeleteTransaction"
					>
						<LoaderIcon :icon="Trash" :loading="deleteConfirmDialogProcessing" />
						<span>Delete</span>
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	</div>
</template>
