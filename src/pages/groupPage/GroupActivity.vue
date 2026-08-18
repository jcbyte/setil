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
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { useControlledDialog } from "@/composables/useControlledDialog";
import type { GroupWithUserPublic } from "@/composables/useLiveGroupWithUserPublic";
import { CategorySettings } from "@/constants/category";
import { deleteTransaction } from "@/firebase/firestore/transaction";
import type { Transaction } from "@/types/firestore";
import { getLeftUsersInTransaction, sumRecordValues } from "@/util/util";
import { ArrowRight, EllipsisVertical, FilePen, FileText, Trash } from "@lucide/vue";
import { formatCurrency } from "@shared/currency";
import { computed, ref, watch } from "vue";
import { toast } from "vue-sonner";

const ITEMS_PER_PAGE = 10;

const props = defineProps<{
	groupId: string;
	group: GroupWithUserPublic;
}>();

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

const currentPage = ref(1);
const pageTransition = ref<"fade-slide" | "fade-slide-right">("fade-slide-right");

watch(currentPage, (newPage, oldPage) => {
	pageTransition.value = newPage > oldPage ? "fade-slide-right" : "fade-slide";
});

const pagedTransactions = computed(() => {
	const transactionIdx = (currentPage.value - 1) * ITEMS_PER_PAGE;
	return sortedTransactions.value.slice(transactionIdx, transactionIdx + ITEMS_PER_PAGE);
});

interface MonthTransactionGroup {
	monthGroup: string;
	transactions: [string, Transaction][];
}

const groupedPagedTransactions = computed(() => {
	const groups: MonthTransactionGroup[] = [];
	pagedTransactions.value.forEach(([transactionId, transaction]: [string, Transaction]) => {
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
				<template v-if="group.transactions">
					<template v-if="groupedPagedTransactions.length > 0">
						<div class="flex flex-col gap-4">
							<Transition :name="pageTransition" mode="out-in">
								<div :key="currentPage" class="flex flex-col gap-3.5">
									<div
										v-for="groupedTransactions in groupedPagedTransactions"
										:key="groupedTransactions.monthGroup"
										class="flex flex-col gap-0.5"
									>
										<span class="px-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
											{{ groupedTransactions.monthGroup }}
										</span>
										<div
											v-for="[transactionId, transaction] in groupedTransactions.transactions"
											:key="transactionId"
											class="flex items-center justify-between gap-4 border-b last:border-b-0 border-border/60 px-1 sm:px-2 py-2 transition-colors hover:bg-muted/35"
										>
											<div v-if="transaction.type === 'expense'" class="flex items-center gap-2 min-w-0" >
												<div class="relative flex justify-center items-center">
													<Avatar
														v-if="props.group.users && props.group.users[transaction.from].computed.name"
														:src="props.group.users[transaction.from].public?.photoUrl ?? null"
														:name="props.group.users[transaction.from].computed.name!"
                            :uid="transaction.from"
													/>
													<Skeleton v-else class="size-10 rounded-full" />
													<div
														class="absolute -bottom-1 -right-1 rounded-full bg-card size-5.5 flex justify-center items-center"
													>
														<component :is="CategorySettings[transaction.category].icon" class="size-3" />
													</div>
												</div>
												<div class="flex flex-col min-w-0">
													<span class="truncate">{{ transaction.title }}</span>
														<span
															v-if="props.group.users && props.group.users[transaction.from].computed.name"
															class="text-sm text-muted-foreground min-w-0 truncate"
														>
															by {{ props.group.users[transaction.from].computed.name }}
														</span>
														<Skeleton v-else class="w-18 h-5" />
												</div>
											</div>
                      <div v-else class="flex items-center gap-2 min-w-0">
                        <div class="relative flex justify-center items-center bg-muted rounded-full">
                          <Avatar
													v-if="props.group.users && props.group.users[transaction.from].computed.name"
													:src="props.group.users[transaction.from].public?.photoUrl ?? null"
													:name="props.group.users[transaction.from].computed.name!"
                          :uid="transaction.from"
													class="-mr-0.5"
												/>
												<Skeleton v-else class="size-10 rounded-full -mr-0.5" />
												<div
													class="absolute left-1/2 -translate-x-1/2 bg-primary rounded-full flex justify-center items-center size-4"
                          >
													<ArrowRight class="text-primary-foreground size-3" />
												</div>
												<Avatar
													v-if="props.group.users && props.group.users[transaction.to].computed.name"
													:src="props.group.users[transaction.to].public?.photoUrl ?? null"
													:name="props.group.users[transaction.to].computed.name!"
                          :uid="transaction.to"
													class="-ml-0.5"
                          />
												<Skeleton v-else class="size-10 rounded-full -ml-0.5" />
                      </div>
                      <div class="flex flex-col min-w-0">
                        <span class="truncate">Setil Up</span>
                        <div class="flex items-center gap-1 min-w-0">
                          <span
                          v-if="props.group.users && props.group.users[transaction.from].computed.name"
                          class="text-sm text-muted-foreground min-w-0 truncate"
                          >
                            {{ props.group.users[transaction.from].computed.name }}
                          </span>
                          <Skeleton v-else class="w-18 h-5" />
                          <ArrowRight class="text-muted-foreground size-3 shrink-0" />
                                                    <span
                          v-if="props.group.users && props.group.users[transaction.to].computed.name"
                          class="text-sm text-muted-foreground min-w-0 truncate flex-1"
                          >
                            {{ props.group.users[transaction.to].computed.name }}
                          </span>
                          <Skeleton v-else class="w-18 h-5" />
                        </div>
                      </div>
											</div>

											<div class="flex items-center gap-2">
												<div class="flex flex-col items-end">
													<span class="text-nowrap">
														{{
															props.group.data
																? formatCurrency(transaction.type === "expense" ? sumRecordValues(transaction.to) : transaction.amount, props.group.data.currency)
																: (transaction.type === "expense" ? sumRecordValues(transaction.to) : transaction.amount)
														}}
													</span>
													<span class="text-sm text-muted-foreground text-nowrap">
														{{
															transaction.date.toDate().toLocaleString(undefined, {
																day: "numeric",
																month: "short",
															})
														}}
													</span>
												</div>
												<DropdownMenu>
													<DropdownMenuTrigger as-child>
														<div
															class="group flex justify-center items-center rounded-md hover:bg-muted size-7 p-1 transition-colors"
														>
															<EllipsisVertical
																class="text-muted-foreground transition-colors group-hover:text-foreground"
															/>
														</div>
													</DropdownMenuTrigger>
													<DropdownMenuContent>
														<RouterLink v-if="transaction.type === 'expense'"" :to="`/group/${groupId}/transaction/${transactionId}`">
															<DropdownMenuItem>
																<div class="w-full flex justify-between items-center">
																	<span>Edit</span>
																	<FilePen class="size-5" />
																</div>
															</DropdownMenuItem>
														</RouterLink>
														<DropdownMenuSeparator v-if="transaction.type === 'expense'""  />
														<DropdownMenuItem @click="openDeleteConfirmDialog({ transactionId })">
															<div class="w-full flex justify-between items-center">
																<span class="text-red-400">Delete</span>
																<Trash class="text-red-400 size-5" />
															</div>
														</DropdownMenuItem>
													</DropdownMenuContent>
												</DropdownMenu>
											</div>
										</div>
									</div>
								</div>
							</Transition>
							<Pagination
								v-model:page="currentPage"
								:items-per-page="ITEMS_PER_PAGE"
								:total="sortedTransactions.length"
							>
								<PaginationContent v-slot="{ items }">
									<PaginationPrevious />

									<template v-for="(item, index) in items" :key="index">
										<PaginationItem
											v-if="item.type === 'page'"
											:value="item.value"
											:is-active="item.value === currentPage"
										>
											{{ item.value }}
										</PaginationItem>

										<PaginationEllipsis v-else :index="index" />
									</template>

									<PaginationNext />
								</PaginationContent>
							</Pagination>
						</div>
					</template>

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
				<div v-else class="flex flex-col gap-4">
					<div v-for="i in 3" class="flex flex-col gap-1">
						<Skeleton class="w-34 h-5" />
						<Skeleton v-for="_ in Math.trunc(i * 1.5)" class="w-full h-15" />
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
