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
import { useToast } from "@/components/ui/toast";
import YourAccountSettings from "@/components/YourAccountSettings.vue";
import { useControlledDialog } from "@/composables/useControlledDialog";
import { useCurrentUser } from "@/composables/useCurrentUser";
import { useLiveGroup } from "@/composables/useLiveGroup";
import { AC_NAME, PHOTO_URL } from "@/CONST_USE";
import {
	changeUserNickname,
	createGroup,
	deleteGroup as firestoreDeleteGroup,
	leaveGroup as firestoreLeaveGroup,
	promoteUser,
	removeUser,
	updateGroup,
} from "@/firebase/firestore/group";
import type { GroupUserData } from "@/firebase/types";
import { type Currency } from "@/firebase/types";
import { inviteUser, noGroup } from "@/util/app";
import { CurrencySettings } from "@/util/currency";
import { getRouteParam } from "@/util/util";
import { toTypedSchema } from "@vee-validate/zod";
import { Timestamp } from "firebase/firestore";
import {
	ArrowBigUpDash,
	ArrowLeft,
	Check,
	ChevronDown,
	LogOut,
	Pencil,
	Plus,
	Save,
	Trash,
	UserRound,
	UserRoundPlus,
	X,
} from "lucide-vue-next";
import { useForm } from "vee-validate";
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import * as z from "zod";

const router = useRouter();
const route = useRoute();
const groupId = getRouteParam(route.params.groupId);
const newGroup = groupId === null;
const { currentUser } = useCurrentUser();
const { toast } = useToast();
const group = useLiveGroup(groupId, groupId ? noGroup : () => {});

let loaded = false;
watch(
	group,
	(groupValue) => {
		if (!loaded && !newGroup && groupValue) {
			loaded = true;

			setValues({
				name: groupValue.data.name,
				description: groupValue.data.description ?? undefined,
				currency: groupValue.data.currency,
			});

			myDisplayName.value = groupValue.users[currentUser.value!.uid].name;
		}
	},
	{ immediate: true },
);

const isGroupDetailsUpdating = ref<boolean>(false);
const isMyDisplayNameUpdating = ref<boolean>(false);
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

			toast({ title: "Group Created", description: "A fellowship of finances has been forged.", duration: 5000 });
			router.push(`/group/${newGroupId}`);
		} else {
			await updateGroup(groupId, {
				name: values.name,
				description: values.description ?? null,
				currency: values.currency as Currency,
			});

			toast({ title: "Group Details Updated", description: "Like a fresh coat of paint.", duration: 5000 });
		}
	} catch (e) {
		toast({ title: "Error Saving Group", description: String(e), variant: "destructive", duration: 5000 });
	}

	isGroupDetailsUpdating.value = false;
});

const currentGroupUser = computed<GroupUserData | null>(() => group.value?.users[currentUser.value!.uid] ?? null);

const myDisplayName = ref<string | undefined>();
const myDisplayNameErrors = ref<string | undefined>();
const displayNameValidation = z.string().min(1, "Name is required").max(50, "Name cannot exceed 50 characters");

function validateMyDisplayName() {
	const parsedName = displayNameValidation.safeParse(myDisplayName.value);
	myDisplayNameErrors.value = parsedName.success ? undefined : parsedName.error.issues[0].message;
}

async function updateDisplayName() {
	if (!groupId) return;

	const parsedName = displayNameValidation.safeParse(myDisplayName.value);
	if (!parsedName.success) return;

	isMyDisplayNameUpdating.value = true;

	try {
		await changeUserNickname(groupId, currentUser.value!.uid, parsedName.data);

		toast({
			title: "Name Updated",
			description: "And just like that... a new legend is born!",
			duration: 5000,
		});
	} catch (e) {
		toast({ title: "Error Updating Name", description: String(e), variant: "destructive", duration: 5000 });
	}

	isMyDisplayNameUpdating.value = false;
}

const memberNewName = ref<Record<string, { updating: boolean; name: string; processing: boolean; errors?: string }>>(
	{},
);

function validateMemberName(userId: string) {
	const parsedName = displayNameValidation.safeParse(memberNewName.value[userId].name);
	memberNewName.value[userId].errors = parsedName.success ? undefined : parsedName.error.issues[0].message;
}

function startRename(userId: string) {
	memberNewName.value[userId] = {
		updating: true,
		name: group.value?.users[userId].name ?? AC_NAME,
		processing: false,
	};
}

function cancelRename(userId: string) {
	memberNewName.value[userId].updating = false;
}

async function acceptRename(userId: string) {
	if (!groupId) return;
	if (!group.value) return;

	const parsedName = displayNameValidation.safeParse(memberNewName.value[userId].name);
	if (!parsedName.success) return;

	memberNewName.value[userId].processing = true;

	try {
		await changeUserNickname(groupId, userId, parsedName.data);
		toast({
			title: `${group.value.users[userId].name}'s Name Updated`,
			description: "Identity crisis averted.",
			duration: 5000,
		});
	} catch (e) {
		toast({
			title: `Error Updating ${group.value.users[userId].name}'s Name`,
			description: String(e),
			variant: "destructive",
			duration: 5000,
		});
	}

	memberNewName.value[userId].updating = false;
}

async function promoteMember() {
	if (!groupId) return;
	if (!promoteDialogData.value) return;
	if (!group.value) return;

	startPromoteDialogProcessing();

	try {
		await promoteUser(groupId, promoteDialogData.value.userId);
		toast({
			title: `${group.value.users[promoteDialogData.value.userId].name} Promoted`,
			description: "Long live the new king.",
			duration: 5000,
		});
	} catch (e) {
		toast({
			title: `Error Promoting ${group.value.users[promoteDialogData.value.userId].name}`,
			description: String(e),
			variant: "destructive",
			duration: 5000,
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
		toast({
			title: `Removed ${group.value.users[userId].name}`,
			description: "They've been erased from existence... well, at least the group.",
			duration: 5000,
		});
	} catch (e) {
		toast({
			title: `Error Removing ${group.value.users[userId].name}`,
			description: String(e),
			variant: "destructive",
			duration: 5000,
		});
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
		toast({ title: "Error Creating Invite Link", description: String(e), variant: "destructive", duration: 5000 });
	}

	isAddingMember.value = false;
}

async function leaveGroup() {
	if (!groupId) return;

	startLeaveDialogProcessing();

	try {
		await firestoreLeaveGroup(groupId);
		router.push("/");
		toast({ title: "Group Left", description: "Your expenses here are now history.", duration: 5000 });
	} catch (e) {
		toast({ title: "Error Leaving Group", description: String(e), variant: "destructive", duration: 5000 });
	}

	closeLeaveDialog();
}

async function deleteGroup() {
	if (!groupId) return;

	startDeleteDialogProcessing();

	try {
		await firestoreDeleteGroup(groupId);
		toast({ title: "Group Deleted", description: "All data related to this group has been deleted.", duration: 5000 });
		router.push("/");
	} catch (e) {
		toast({ title: "Error Deleting Group", description: String(e), variant: "destructive", duration: 5000 });
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
							<FormField v-slot="{ componentField }" name="name" :validate-on-blur="!isFieldDirty">
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

							<FormField v-slot="{ componentField }" name="description" :validate-on-blur="!isFieldDirty">
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

							<FormField v-slot="{ componentField }" name="currency" :validate-on-blur="!isFieldDirty">
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
						<Avatar :src="PHOTO_URL" :name="currentGroupUser.name" class="size-9" />
						<div class="flex flex-col">
							<span>{{ currentGroupUser.name }}</span>
							<span class="text-sm text-muted-foreground">
								{{ currentUser!.uid === group.data.owner ? "Owner" : "Member" }}
							</span>
						</div>
					</div>
					<Skeleton v-else class="w-56 h-10" />
					<div class="flex flex-col gap-2">
						<span :class="`text-sm font-[500] ${myDisplayNameErrors && 'text-destructive'}`">Display Name</span>
						<div class="flex justify-center items-center gap-2">
							<div class="relative w-full">
								<Input
									v-model:model-value="myDisplayName"
									class="pl-8"
									autocomplete="off"
									type="text"
									placeholder="Name"
									:disabled="isMyDisplayNameUpdating"
									@update:model-value="validateMyDisplayName"
								/>
								<span class="absolute left-0 inset-y-0 flex items-center justify-center px-2 text-muted-foreground">
									<UserRound class="size-4" />
								</span>
							</div>
							<Button type="button" :disabled="isMyDisplayNameUpdating" class="w-fit" @click="updateDisplayName">
								<LoaderIcon :icon="Check" :loading="isMyDisplayNameUpdating" />
								<span>Update</span>
							</Button>
						</div>
						<span v-if="myDisplayNameErrors" class="text-[12.8px] text-destructive">{{ myDisplayNameErrors }}</span>
					</div>
				</div>

				<div v-if="!newGroup" class="border border-border rounded-lg flex flex-col gap-6 p-4">
					<div class="flex flex-col">
						<span class="text-lg font-semibold">Members</span>
						<span class="text-sm text-muted-foreground">View and manage group members</span>
					</div>

					<div v-if="group" class="flex flex-col gap-4">
						<div
							v-if="group.users"
							v-for="(user, userId) in Object.fromEntries(
								Object.entries(group.users).filter(([, user]) => user.status !== 'history'),
							) as Record<string, GroupUserData>"
							class="flex flex-col gap-2"
						>
							<div class="flex justify-between items-center gap-2">
								<div class="flex items-center gap-2 flex-1">
									<Avatar
										:src="PHOTO_URL"
										:name="user.name"
										:class="`size-9 ${user.status === 'left' && 'opacity-70'}`"
									/>
									<div v-if="!(memberNewName[userId]?.updating ?? false)" class="flex flex-col">
										<span :class="`${user.status === 'left' && 'text-muted-foreground'}`">{{ user.name }}</span>
										<span :class="`text-sm text-muted-foreground ${user.status !== 'active' && 'italic'}`">
											{{
												user.status === "active" ? (userId === group!.data.owner ? "Owner" : "Member") : "Left Group"
											}}
										</span>
									</div>
									<div v-else class="flex-1 flex gap-2">
										<Input
											v-model:model-value="memberNewName[userId].name"
											autocomplete="off"
											type="text"
											placeholder="Name"
											:disabled="memberNewName[userId].processing"
											@update:model-value="validateMemberName(userId)"
										/>
										<Button class="size-9" @click="acceptRename(userId)" :disabled="memberNewName[userId].processing">
											<LoaderIcon :icon="Check" :loading="memberNewName[userId].processing" />
										</Button>
										<Button
											variant="outline"
											class="size-9"
											@click="cancelRename(userId)"
											:disabled="memberNewName[userId].processing"
										>
											<X />
										</Button>
									</div>
								</div>
								<DropdownMenu
									v-if="currentUser?.uid === group.data.owner && !(memberNewName[userId]?.updating ?? false)"
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
										<DropdownMenuItem @click="startRename(userId)">
											<div class="w-full flex justify-between items-center">
												<span>Rename</span>
												<Pencil class="!size-5" />
											</div>
										</DropdownMenuItem>
										<DropdownMenuItem @click="openPromoteDialog({ userId })" :disabled="user.status !== 'active'">
											<div class="w-full flex justify-between items-center">
												<span>Promote</span>
												<ArrowBigUpDash class="!size-5" />
											</div>
										</DropdownMenuItem>
										<DropdownMenuSeparator />
										<DropdownMenuItem @click="removeMember(userId)" :disabled="user.status !== 'active'">
											<div class="w-full flex justify-between items-center">
												<span class="text-red-400">Remove</span>
												<Trash class="text-red-400 !size-5" />
											</div>
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
							<span v-if="memberNewName[userId]?.errors ?? false" class="text-[12.8px] ml-11 text-destructive">
								{{ memberNewName[userId].errors }}
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
							{{ group!.users[promoteDialogData!.userId].name }}
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
