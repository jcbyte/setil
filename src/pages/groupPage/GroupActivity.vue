<script setup lang="ts">
import LoaderIcon from "@/components/LoaderIcon.vue";
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Button from "@/components/ui/button/Button.vue";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Separator from "@/components/ui/separator/Separator.vue";
import { useToast } from "@/components/ui/toast";
import { useControlledDialog } from "@/composables/useControlledDialog";
import type { Group } from "@/composables/useLiveGroup";
import { deleteTransaction } from "@/firebase/firestore/transaction";
import type { Transaction } from "@/firebase/types";
import { CategorySettings } from "@/util/category";
import { formatCurrency } from "@/util/currency";
import { getLeftUsersInTransaction, sumRecord } from "@/util/util";
import { Calendar, EllipsisVertical, FilePen, Trash, UserRound } from "lucide-vue-next";
import { computed } from "vue";
import { useRouter } from "vue-router";

const props = defineProps<{
	groupId: string;
	group: Group;
}>();

const router = useRouter();
const { toast } = useToast();

const {
	open: deleteConfirmDialogOpen,
	processing: deleteConfirmDialogProcessing,
	openDialog: openDeleteConfirmDialog,
	startDialogProcessing: startDeleteConfirmDialogProcessing,
	closeDialog: closeDeleteConfirmDialog,
	data: deleteDialogData,
} = useControlledDialog<{ transactionId: string }>();

const sortedTransactions = computed(() => {
	return Object.entries(props.group.transactions).sort(
		([, transactionA]: [string, Transaction], [, transactionB]: [string, Transaction]) => {
			return transactionB.date.seconds - transactionA.date.seconds;
		},
	);
});

async function handleDeleteTransaction() {
	startDeleteConfirmDialogProcessing();

	const leftUsers = getLeftUsersInTransaction(
		props.group.transactions[deleteDialogData.value!.transactionId],
		props.group.users,
	);
	try {
		await deleteTransaction(props.groupId, deleteDialogData.value!.transactionId, leftUsers);
		toast({ title: "Expense Deleted", description: "It's like it never happened.", duration: 5000 });
	} catch (e) {
		toast({ title: "Error Deleting Expense", description: String(e), variant: "destructive", duration: 5000 });
	}

	closeDeleteConfirmDialog();
}
</script>

<template>
	<div>
		<div class="flex flex-col gap-2 border border-border rounded-lg p-4">
			<div class="flex flex-col">
				<span class="text-lg font-semibold">Group Activity</span>
				<span class="text-sm text-muted-foreground">Transactions in this group</span>
			</div>
			<div class="flex flex-col">
				<div v-for="([transactionId, transaction], index) in sortedTransactions">
					<div class="flex flex-col">
						<div class="flex justify-between items-center">
							<div class="flex items-center gap-3">
								<div class="bg-secondary rounded-lg size-9 p-2 flex justify-center items-center">
									<component :is="CategorySettings[transaction.category].icon" />
								</div>
								<div class="flex flex-col">
									<div class="text-lg font-semibold">{{ transaction.title }}</div>
									<div class="flex flex-col-reverse sm:flex-row gap-0 sm:gap-2">
										<div class="flex items-center gap-1">
											<Calendar class="!size-4 text-muted-foreground" />
											<span class="text-sm text-muted-foreground text-nowrap">{{
												transaction.date.toDate().toLocaleDateString()
											}}</span>
										</div>
										<div class="flex items-center gap-1">
											<UserRound class="!size-4 text-muted-foreground" />
											<span class="text-sm text-muted-foreground text-nowrap">{{
												props.group.users[transaction.from].name
											}}</span>
										</div>
									</div>
								</div>
							</div>
							<div class="flex justify-center items-center gap-2">
								<span class="text-lg">
									{{ formatCurrency(sumRecord(transaction.to), props.group.data.currency) }}
								</span>
								<DropdownMenu>
									<DropdownMenuTrigger as-child>
										<Button variant="ghost" class="size-8">
											<EllipsisVertical class="!size-5" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent>
										<DropdownMenuItem @click="router.push(`/group/${groupId}/transaction/${transactionId}`)">
											<div class="w-full flex justify-between items-center">
												<span>Edit</span>
												<FilePen class="!size-5" />
											</div>
										</DropdownMenuItem>
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
						<Separator v-if="index < sortedTransactions.length - 1" class="my-2" />
					</div>
				</div>
				<div v-if="sortedTransactions.length === 0" class="flex justify-center items-center">
					<span class="text-sm text-muted-foreground">No Activity</span>
				</div>
			</div>
		</div>

		<AlertDialog v-model:open="deleteConfirmDialogOpen">
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
					<AlertDialogDescription>
						This cannot be undone and will permanently delete the transaction.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter class="gap-2">
					<Button variant="outline" :disabled="deleteConfirmDialogProcessing" @click="closeDeleteConfirmDialog">
						Cancel
					</Button>
					<Button variant="destructive" :disabled="deleteConfirmDialogProcessing" @click="handleDeleteTransaction">
						<LoaderIcon :icon="Trash" :loading="deleteConfirmDialogProcessing" />
						<span>Delete</span>
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	</div>
</template>
