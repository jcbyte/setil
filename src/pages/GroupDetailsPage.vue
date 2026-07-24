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
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import YourAccountSettings from "@/components/YourAccountSettings.vue";
import { useControlledDialog } from "@/composables/useControlledDialog";
import { useCurrentUser } from "@/composables/useCurrentUser";
import useLiveGroupWithUserPublic, { type GroupUserDataWithPublic } from "@/composables/useLiveGroupWithUserPublic";
import {
	changeUserNickname,
	clearUserNickname,
	createGroup,
	deleteGroup as firestoreDeleteGroup,
	leaveGroup as firestoreLeaveGroup,
	promoteUser,
	removeUser,
	updateGroup,
} from "@/firebase/firestore/group";
import { type Currency } from "@/firebase/types";
import { inviteUser, noGroup } from "@/util/app";
import { CurrencySettings } from "@/util/currency";
import { getRouteParam } from "@/util/util";
import {
	ArrowBigUpDash,
	ArrowLeft,
	Check,
	ChevronDown,
	CircleX,
	Dot,
	Loader2,
	LogOut,
	Pencil,
	Plus,
	Save,
	Trash,
	UserMinus,
	UserRound,
	UserRoundPlus,
	X,
} from "@lucide/vue";
import { toTypedSchema } from "@vee-validate/zod";
import { Timestamp } from "firebase/firestore";
import { useForm } from "vee-validate";
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { toast } from "vue-sonner";
import * as z from "zod";

const router = useRouter();
const route = useRoute();
const groupId = getRouteParam(route.params.groupId);
const newGroup = groupId === null;
const currentUser = useCurrentUser();
const group = useLiveGroupWithUserPublic(groupId, () => {
	if (!groupId) return; // If this is not a group, then do not error
	if (leaveDialogProcessing.value || deleteDialogProcessing.value) return; // If we are currently leaving/deleting, we may not have access to do not error
	noGroup(router); // An error has actually occurred
});

let loaded = false;
watch(
	group,
	(groupValue) => {
		if (loaded || !groupValue) return;
		loaded = true;

		if (!newGroup) {
			setValues({
				name: groupValue.data.name,
				description: groupValue.data.description ?? undefined,
				currency: groupValue.data.currency,
			});

			myNickname.value = groupValue.users[currentUser.value!.uid].nickname ?? "";
		}
	},
	{ immediate: true },
);

const isGroupDetailsUpdating = ref<boolean>(false);
const isMyNicknameUpdating = ref<boolean>(false);
const isMyNicknameClearing = ref<boolean>(false);
const isAddingMember = ref<boolean>(false);
const isUpdatingMember = ref<string[]>([]);

const {
	open: leaveDialogOpen,
	processing: leaveDialogProcessing,
	openDialog: openLeaveDialog,
	startDialogProcessing: startLeaveDialogProcessing,
	closeDialog: closeLeaveDialog,
} = useControlledDialog();

const {
	open: deleteDialogOpen,
	processing: deleteDialogProcessing,
	openDialog: openDeleteDialog,
	startDialogProcessing: startDeleteDialogProcessing,
	closeDialog: closeDeleteDialog,
} = useControlledDialog();

const {
	open: promoteDialogOpen,
	processing: promoteDialogProcessing,
	openDialog: openPromoteDialog,
	startDialogProcessing: startPromoteDialogProcessing,
	closeDialog: closePromoteDialog,
	data: promoteDialogData,
} = useControlledDialog<{ userId: string }>();

const formSchema = toTypedSchema(
	z.object({
		name: z.string().min(1, "Group name is required").max(50, "Group name cannot exceed 50 characters"),
		description: z.string().optional(),
		currency: z.string().refine((val) => Object.keys(CurrencySettings).includes(val), "Must select a valid currency"),
	}),
);

const { isFieldDirty, handleSubmit, setValues } = useForm({
	validationSchema: formSchema,
});

const onSubmit = handleSubmit(async (values) => {
	isGroupDetailsUpdating.value = true;

	try {
		if (newGroup) {
			const newGroupId = await createGroup({
				name: values.name,
				description: values.description ?? null,
				currency: values.currency as Currency,
				lastUpdate: Timestamp.now(),
			});

			toast("Group Created", { description: "A fellowship of finances has been forged." });
			router.push(`/group/${newGroupId}`);
		} else {
			await updateGroup(groupId, {
				name: values.name,
				description: values.description ?? null,
				currency: values.currency as Currency,
			});

			toast("Group Details Updated", { description: "Like a fresh coat of paint." });
		}
	} catch (e) {
		toast.error("Error Saving Group", { description: String(e) });
	}

	isGroupDetailsUpdating.value = false;
});

const currentGroupUser = computed<GroupUserDataWithPublic | null>(
	() => group.value?.users[currentUser.value!.uid] ?? null,
);

const nicknameValidation = z.string().min(1, "Name is required").max(50, "Name cannot exceed 50 characters");

const myNickname = ref<string | undefined>();
const myNicknameErrors = ref<string | undefined>();

function validateMyNickname() {
	const parsedName = nicknameValidation.safeParse(myNickname.value);
	myNicknameErrors.value = parsedName.success ? undefined : parsedName.error.issues[0].message;
}

async function updateMyNickname() {
	if (!groupId) return;

	const parsedName = nicknameValidation.safeParse(myNickname.value);
	if (!parsedName.success) return;

	isMyNicknameUpdating.value = true;

	try {
		await changeUserNickname(groupId, currentUser.value!.uid, parsedName.data);

		toast("Nickname Updated", {
			description: "And just like that... a new legend is born!",
		});
	} catch (e) {
		toast.error("Error Updating Name", { description: String(e) });
	}

	isMyNicknameUpdating.value = false;
}

async function clearMyNickname() {
	if (!groupId) return;

	isMyNicknameClearing.value = true;

	try {
		await clearUserNickname(groupId, currentUser.value!.uid);

		toast("Nickname Cleared", { description: "No more secret identities." });
	} catch (e) {
		toast.error("Error Updating Name", { description: String(e) });
	}

	myNickname.value = "";
	isMyNicknameClearing.value = false;
}

const memberNewNickname = ref<
	Record<string, { updating: boolean; nickname: string; processing: boolean; errors?: string }>
>({});
const memberNicknamesClearing = ref<Set<String>>(new Set());

function validateMemberName(userId: string) {
	const parsedName = nicknameValidation.safeParse(memberNewNickname.value[userId].nickname);
	memberNewNickname.value[userId].errors = parsedName.success ? undefined : parsedName.error.issues[0].message;
}

function startRename(userId: string) {
	if (!group.value) return;

	memberNewNickname.value[userId] = {
		updating: true,
		nickname: group.value.users[userId].nickname ?? "",
		processing: false,
	};
}

function cancelRename(userId: string) {
	memberNewNickname.value[userId].updating = false;
}

async function acceptRename(userId: string) {
	if (!groupId) return;
	if (!group.value) return;

	const parsedName = nicknameValidation.safeParse(memberNewNickname.value[userId].nickname);
	if (!parsedName.success) return;

	memberNewNickname.value[userId].processing = true;

	try {
		await changeUserNickname(groupId, userId, parsedName.data);
		toast(`${parsedName.data}'s Nickname Updated`, {
			description: "Identity crisis averted.",
		});
	} catch (e) {
		toast.error(`Error Updating ${group.value.users[userId].computed.name}'s Name`, {
			description: String(e),
		});
	}

	memberNewNickname.value[userId].updating = false;
}

async function clearNickname(userId: string) {
	if (!groupId) return;
	if (!group.value) return;

	memberNicknamesClearing.value.add(userId);

	try {
		await clearUserNickname(groupId, userId);
		toast(`${group.value.users[userId].public?.name}'s Nickname Cleared`, {
			description: "The disguise has been removed.",
		});
	} catch (e) {
		toast.error(`Error Updating ${group.value.users[userId].computed.name}'s Name`, {
			description: String(e),
		});
	}

	memberNicknamesClearing.value.delete(userId);
}

async function promoteMember() {
	if (!groupId) return;
	if (!promoteDialogData.value) return;
	if (!group.value) return;

	startPromoteDialogProcessing();

	try {
		await promoteUser(groupId, promoteDialogData.value.userId);
		toast(`${group.value.users[promoteDialogData.value.userId].computed.name} Promoted`, {
			description: "Long live the new king.",
		});
	} catch (e) {
		toast.error(`Error Promoting ${group.value.users[promoteDialogData.value.userId].computed.name}`, {
			description: String(e),
		});
	}

	closePromoteDialog();
}

async function removeMember(userId: string) {
	if (!groupId) return;
	if (!group.value) return;

	isUpdatingMember.value.push(userId);

	try {
		await removeUser(groupId, userId);
		toast(`Removed ${group.value.users[userId].computed.name}`, {
			description: "They've been erased from existence... well, at least the group.",
		});
	} catch (e) {
		toast.error(`Error Removing ${group.value.users[userId].computed.name}`, { description: String(e) });
	}

	isUpdatingMember.value.splice(isUpdatingMember.value.indexOf(userId), 1);
}

async function addMember() {
	if (!groupId) return;
	if (!group.value) return;

	isAddingMember.value = true;

	try {
		await inviteUser(groupId, group.value.data.name);
	} catch (e) {
		toast.error("Error Creating Invite Link", { description: String(e) });
	}

	isAddingMember.value = false;
}

async function leaveGroup() {
	if (!groupId) return;

	startLeaveDialogProcessing();

	try {
		await firestoreLeaveGroup(groupId);
		router.push("/");
		toast("Group Left", { description: "Your expenses here are now history." });
	} catch (e) {
		toast.error("Error Leaving Group", { description: String(e) });
	}

	closeLeaveDialog();
}

async function deleteGroup() {
	if (!groupId) return;

	startDeleteDialogProcessing();

	try {
		await firestoreDeleteGroup(groupId);
		router.push("/");
		toast("Group Deleted", { description: "All data related to this group has been deleted." });
	} catch (e) {
		toast.error("Error Deleting Group", { description: String(e) });
	}

	closeDeleteDialog();
}
</script>

<template>
	<div>
		<div class="w-full flex flex-col gap-4 items-center">
			<div class="w-full flex justify-between items-center">
				<div class="flex gap-2 justify-center items-center">
					<Button variant="ghost" class="size-9" @click="router.push(groupId ? `/group/${groupId}` : '/')">
						<ArrowLeft class="!size-6" />
					</Button>
					<span class="text-lg font-semibold">{{ newGroup ? "New Group" : "Group Settings" }}</span>
				</div>
				<YourAccountSettings />
			</div>

			<div class="w-full max-w-[32rem] flex flex-col gap-4">
				<div class="border border-border rounded-lg flex flex-col gap-6 p-4">
					<div class="flex flex-col">
						<span class="text-lg font-semibold">Group Details</span>
						<span class="text-sm text-muted-foreground">
							{{ newGroup ? "Enter your new groups information" : "Update your group information" }}
						</span>
					</div>

					<form class="flex flex-col gap-4" @submit="onSubmit">
						<div class="flex flex-col gap-2">
							<FormField v-slot="{ componentField }" name="name" :validate-on-blur="isFieldDirty('name')">
								<FormItem>
									<FormLabel>Group Name</FormLabel>
									<FormControl>
										<Input
											autocomplete="off"
											type="text"
											placeholder="Germany Trip"
											:disabled="isGroupDetailsUpdating"
											v-bind="componentField"
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							</FormField>

							<FormField v-slot="{ componentField }" name="description" :validate-on-blur="isFieldDirty('description')">
								<FormItem>
									<FormLabel>Description</FormLabel>
									<FormControl>
										<Textarea
											placeholder="Expenses for Munich Trip."
											:disabled="isGroupDetailsUpdating"
											v-bind="componentField"
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							</FormField>

							<FormField v-slot="{ componentField }" name="currency" :validate-on-blur="isFieldDirty('currency')">
								<FormItem>
									<FormLabel>Currency</FormLabel>
									<Select v-bind="componentField" :disabled="isGroupDetailsUpdating">
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder="Euro (€)" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											<SelectItem v-for="(currency, currencyId) in CurrencySettings" :value="currencyId">
												{{ currency.name }} ({{ currency.symbol.trim() }})
											</SelectItem>
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							</FormField>
						</div>

						<Button type="submit" :disabled="isGroupDetailsUpdating" class="w-fit place-self-end">
							<LoaderIcon :icon="newGroup ? Plus : Save" :loading="isGroupDetailsUpdating" />
							<span>{{ newGroup ? "Create Group" : "Save Changes" }}</span>
						</Button>
					</form>
				</div>

				<div v-if="!newGroup" class="border border-border rounded-lg flex flex-col gap-4 p-4">
					<div class="flex flex-col">
						<span class="text-lg font-semibold">Your Group Profile</span>
						<span class="text-sm text-muted-foreground">How others see you in this group</span>
					</div>
					<div v-if="group && currentGroupUser" class="flex items-center gap-2">
						<Avatar
							v-if="currentGroupUser.computed.name"
							:src="currentGroupUser.public?.photoUrl ?? null"
							:name="currentGroupUser.computed.name"
							class="size-9"
						/>
						<Skeleton v-else class="size-9 rounded-full" />
						<div class="flex flex-col">
							<span v-if="currentGroupUser.computed.name">{{ currentGroupUser.computed.name }}</span>
							<Skeleton v-else class="w-22 h-6" />
							<span class="text-sm text-muted-foreground">
								{{ currentUser!.uid === group.data.owner ? "Owner" : "Member" }}
							</span>
						</div>
					</div>
					<Skeleton v-else class="w-56 h-10" />
					<div class="flex flex-col gap-2">
						<div class="flex items-center gap-1">
							<span :class="`text-sm font-[500] ${myNicknameErrors && 'text-destructive'}`">Your Nickname</span>
							<Dot v-if="currentGroupUser?.nickname || isMyNicknameClearing" class="size-4 text-muted-foreground" />
							<Button
								v-if="currentGroupUser?.nickname || isMyNicknameClearing"
								variant="link"
								:disabled="isMyNicknameClearing"
								class="h-5 p-0 text-sm text-muted-foreground"
								@click="clearMyNickname"
								>Clear Nickname</Button
							>
							<Loader2 v-if="isMyNicknameClearing" class="size-4 text-muted-foreground animate-spin" />
						</div>
						<div class="flex justify-center items-center gap-2">
							<div class="relative w-full">
								<Input
									v-model:model-value="myNickname"
									class="pl-8"
									autocomplete="off"
									type="text"
									:placeholder="currentGroupUser?.public?.name ?? 'Name'"
									:disabled="isMyNicknameUpdating || isMyNicknameClearing"
									@update:model-value="validateMyNickname"
								/>
								<span class="absolute left-0 inset-y-0 flex items-center justify-center px-2 text-muted-foreground">
									<UserRound class="size-4" />
								</span>
							</div>
							<Button
								type="button"
								:disabled="isMyNicknameUpdating || isMyNicknameClearing"
								class="w-fit"
								@click="updateMyNickname"
							>
								<LoaderIcon :icon="Check" :loading="isMyNicknameUpdating" />
								<span>Update</span>
							</Button>
						</div>
						<span v-if="myNicknameErrors" class="text-[12.8px] text-destructive">{{ myNicknameErrors }}</span>
					</div>
				</div>

				<div v-if="!newGroup" class="border border-border rounded-lg flex flex-col gap-6 p-4">
					<div class="flex flex-col">
						<span class="text-lg font-semibold">Members</span>
						<span class="text-sm text-muted-foreground"
							>View {{ currentUser?.uid === group?.data.owner && "and manage" }} group members</span
						>
					</div>

					<div v-if="group" class="flex flex-col gap-4">
						<div
							v-if="group.users"
							v-for="(user, userId) in Object.fromEntries(
								Object.entries(group.users).filter(([, user]) => user.status !== 'history'),
							) as Record<string, GroupUserDataWithPublic>"
							class="flex flex-col gap-2"
						>
							<div class="flex justify-between items-center gap-2">
								<div class="flex items-center gap-2 flex-1">
									<Avatar
										v-if="user.computed.name"
										:src="user.public?.photoUrl ?? null"
										:name="user.computed.name"
										:class="`size-9 ${user.status === 'left' && 'opacity-70'}`"
									/>
									<Skeleton v-else class="size-9 rounded-full" />
									<div v-if="!(memberNewNickname[userId]?.updating ?? false)" class="flex flex-col">
										<span v-if="user.computed.name" :class="`${user.status === 'left' && 'text-muted-foreground'}`">
											{{ user.computed.name }}
										</span>
										<Skeleton v-else class="w-22 h-6" />
										<span :class="`text-sm text-muted-foreground ${user.status !== 'active' && 'italic'}`">
											{{
												user.status === "active" ? (userId === group!.data.owner ? "Owner" : "Member") : "Left Group"
											}}
										</span>
									</div>
									<div v-else class="flex-1 flex gap-2">
										<Input
											v-model:model-value="memberNewNickname[userId].nickname"
											autocomplete="off"
											type="text"
											:placeholder="user.public?.name ?? 'Name'"
											:disabled="memberNewNickname[userId].processing"
											@update:model-value="validateMemberName(userId)"
										/>
										<Button
											class="size-9"
											@click="acceptRename(userId)"
											:disabled="memberNewNickname[userId].processing"
										>
											<LoaderIcon :icon="Check" :loading="memberNewNickname[userId].processing" />
										</Button>
										<Button
											variant="outline"
											class="size-9"
											@click="cancelRename(userId)"
											:disabled="memberNewNickname[userId].processing"
										>
											<X />
										</Button>
									</div>
								</div>
								<DropdownMenu
									v-if="currentUser?.uid === group.data.owner && !(memberNewNickname[userId]?.updating ?? false)"
								>
									<DropdownMenuTrigger as-child>
										<Button
											variant="outline"
											:disabled="userId === group.data.owner || isUpdatingMember.includes(userId)"
										>
											<LoaderIcon
												v-if="userId !== group.data.owner"
												:icon="ChevronDown"
												:loading="isUpdatingMember.includes(userId)"
											/>
											<span>
												{{ userId === group.data.owner ? "Owner" : "Actions" }}
											</span>
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent>
										<DropdownMenuItem
											@click="startRename(userId)"
											:disabled="memberNewNickname[userId]?.updating || memberNicknamesClearing.has(userId)"
										>
											<div class="w-full flex justify-between items-center gap-2">
												<span>Rename</span>
												<Pencil class="!size-5" />
											</div>
										</DropdownMenuItem>
										<DropdownMenuItem
											v-if="user.nickname"
											@click="clearNickname(userId)"
											:disabled="memberNewNickname[userId]?.updating || memberNicknamesClearing.has(userId)"
										>
											<div class="w-full flex justify-between items-center gap-2">
												<span>Clear Nickname</span>
												<CircleX class="!size-5" />
											</div>
										</DropdownMenuItem>
										<DropdownMenuItem @click="openPromoteDialog({ userId })" :disabled="user.status !== 'active'">
											<div class="w-full flex justify-between items-center gap-2">
												<span>Promote</span>
												<ArrowBigUpDash class="!size-5" />
											</div>
										</DropdownMenuItem>
										<DropdownMenuSeparator />
										<DropdownMenuItem @click="removeMember(userId)" :disabled="user.status !== 'active'">
											<div class="w-full flex justify-between items-center gap-2">
												<span class="text-red-400">Remove</span>
												<UserMinus class="text-red-400 !size-5" />
											</div>
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
							<span v-if="memberNewNickname[userId]?.errors ?? false" class="text-[12.8px] ml-11 text-destructive">
								{{ memberNewNickname[userId].errors }}
							</span>
						</div>

						<Button variant="outline" :disabled="isAddingMember" @click="addMember">
							<LoaderIcon :icon="UserRoundPlus" :loading="isAddingMember" />
							<span>Add Member</span>
						</Button>
					</div>
					<Skeleton v-else class="w-full h-36" />
				</div>

				<div v-if="!newGroup" class="border border-border rounded-lg flex flex-col gap-6 p-4">
					<div class="flex flex-col">
						<span class="text-lg font-semibold">Danger Zone</span>
						<span class="text-sm text-muted-foreground">Dangerous action for this group</span>
					</div>

					<div v-if="group" class="flex flex-col gap-4">
						<div class="flex justify-between items-center gap-2">
							<div class="flex flex-col">
								<span>Leave Group</span>
								<span class="text-sm text-muted-foreground">Remove yourself from this group</span>
							</div>
							<Button variant="outline" @click="openLeaveDialog">
								<LogOut />
								<span>Leave</span>
							</Button>
						</div>

						<Separator v-if="currentUser?.uid === group.data.owner" />
						<div v-if="currentUser?.uid === group.data.owner" class="flex justify-between items-center gap-2">
							<div class="flex flex-col">
								<span>Delete Group</span>
								<span class="text-sm text-muted-foreground">Permanently delete this group and all its data</span>
							</div>
							<Button variant="destructive" @click="openDeleteDialog">
								<Trash />
								<span>Delete</span>
							</Button>
						</div>
					</div>
					<Skeleton v-else class="w-full h-28" />
				</div>
			</div>
		</div>

		<AlertDialog v-model:open="promoteDialogOpen">
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
					<AlertDialogDescription>
						Promoting
						<span class="font-semibold">
							{{ group!.users[promoteDialogData!.userId].computed.name }}
						</span>
						to Owner will change your role to Member.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter class="gap-2">
					<Button variant="outline" :disabled="promoteDialogProcessing" @click="closePromoteDialog">Cancel</Button>
					<Button :disabled="promoteDialogProcessing" @click="promoteMember">
						<LoaderIcon :icon="ArrowBigUpDash" :loading="promoteDialogProcessing" />
						<span>Promote</span>
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>

		<AlertDialog v-model:open="leaveDialogOpen">
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
					<AlertDialogDescription>
						Your data will remain in the group until all debts are resolved.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter class="gap-2">
					<Button variant="outline" :disabled="leaveDialogProcessing" @click="closeLeaveDialog">Cancel</Button>
					<Button :disabled="leaveDialogProcessing" @click="leaveGroup">
						<LoaderIcon :icon="LogOut" :loading="leaveDialogProcessing" />
						<span>Leave</span>
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>

		<AlertDialog v-model:open="deleteDialogOpen">
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
					<AlertDialogDescription>
						This action cannot be undone. This will permanently delete the group and all its data.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter class="gap-2">
					<Button variant="outline" :disabled="deleteDialogProcessing" @click="closeDeleteDialog">Cancel</Button>
					<Button variant="destructive" :disabled="deleteDialogProcessing" @click="deleteGroup">
						<LoaderIcon :icon="Trash" :loading="deleteDialogProcessing" />
						<span>Delete</span>
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	</div>
</template>
