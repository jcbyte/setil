<script setup lang="ts">
import Avatar from "@/components/Avatar.vue";
import LoaderIcon from "@/components/LoaderIcon.vue";
import { Button } from "@/components/ui/button";
import Card from "@/components/ui/card/Card.vue";
import CardContent from "@/components/ui/card/CardContent.vue";
import CardDescription from "@/components/ui/card/CardDescription.vue";
import CardFooter from "@/components/ui/card/CardFooter.vue";
import CardHeader from "@/components/ui/card/CardHeader.vue";
import CardTitle from "@/components/ui/card/CardTitle.vue";
import Dialog from "@/components/ui/dialog/Dialog.vue";
import DialogContent from "@/components/ui/dialog/DialogContent.vue";
import DialogDescription from "@/components/ui/dialog/DialogDescription.vue";
import DialogFooter from "@/components/ui/dialog/DialogFooter.vue";
import DialogHeader from "@/components/ui/dialog/DialogHeader.vue";
import DialogTitle from "@/components/ui/dialog/DialogTitle.vue";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import Input from "@/components/ui/input/Input.vue";
import Separator from "@/components/ui/separator/Separator.vue";
import Skeleton from "@/components/ui/skeleton/Skeleton.vue";
import YourAccountSettings from "@/components/YourAccountSettings.vue";
import { useControlledDialog } from "@/composables/useControlledDialog.ts";
import { useCurrentUser } from "@/composables/useCurrentUser.ts";
import useLiveGroupWithUserPublic, { type GroupUserDataWithPublic } from "@/composables/useLiveGroupWithUserPublic.ts";
import {
	changeUserNickname,
	clearUserNickname,
	deleteGroup as firestoreDeleteGroup,
	leaveGroup as firestoreLeaveGroup,
	updateGroup as firestoreUpdateGroup,
	promoteUser,
	removeUser,
} from "@/firebase/firestore/group.ts";
import type { Currency } from "@/firebase/types.ts";
import { inviteUser, noGroup } from "@/util/app.ts";
import { getRouteParam, getStatusUsers } from "@/util/util";
import {
	ArrowBigUpDash,
	ArrowLeft,
	Check,
	ChevronDown,
	CircleX,
	Dot,
	LoaderCircle,
	LogOut,
	Pencil,
	Trash,
	UserMinus,
	UserRound,
	UserRoundPlus,
	X,
} from "@lucide/vue";
import { toTypedSchema } from "@vee-validate/zod";
import { useField } from "vee-validate";
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { toast } from "vue-sonner";
import z from "zod";
import GroupDetailsForm, { type GroupDetailsFormExposed, type GroupDetailsValues } from "./GroupDetailsForm.vue";

const router = useRouter();
const route = useRoute();

const groupId = computed(() => getRouteParam(route.params.groupId));

const group = useLiveGroupWithUserPublic(groupId, () => {
	if (!groupId.value) return; // If this is not a group, then do not error
	if (leaveDialog.processing.value || deleteDialog.processing.value) return; // If we are currently leaving/deleting, we may not have access, so do not error; we will redirect
	noGroup(router); // An error has actually occurred
});

const hasGroupDataLoaded = ref(false);
const hasGroupUsersLoaded = ref(false);
const groupDetailsForm = ref<GroupDetailsFormExposed | null>(null);

watch(
	group,
	(groupValue) => {
		if (!groupValue) {
			hasGroupDataLoaded.value = false;
			hasGroupUsersLoaded.value = false;
			return;
		}

		if (!hasGroupDataLoaded.value && groupValue.data) {
			groupDetailsForm.value?.reset({
				name: groupValue.data.name,
				description: groupValue.data.description ?? undefined,
				currency: groupValue.data.currency,
			});

			hasGroupDataLoaded.value = true;
		}

		if (!hasGroupUsersLoaded.value && groupValue.users) {
			const myLoadedNickname = currentUser.value && groupValue.users[currentUser.value.uid].nickname;
			if (myLoadedNickname) resetMyNickname({ value: myLoadedNickname });

			hasGroupUsersLoaded.value = true;
		}
	},
	{ immediate: true },
);

const isGroupDetailsUpdating = ref<boolean>(false);

async function updateGroup(details: GroupDetailsValues) {
	if (!groupId.value) return;

	isGroupDetailsUpdating.value = true;

	try {
		await firestoreUpdateGroup(groupId.value, {
			name: details.name,
			description: details.description ?? null,
			currency: details.currency as Currency,
		});

		toast("Group Details Updated", { description: "Like a fresh coat of paint." });
	} catch (e) {
		toast.error("Error Saving Group", { description: String(e) });
	}

	isGroupDetailsUpdating.value = false;
}

const currentUser = useCurrentUser();
const currentGroupUser = computed<GroupUserDataWithPublic | null>(
	() => (currentUser.value && group.value?.users?.[currentUser.value.uid]) ?? null,
);

const nicknameSchema = z.string().trim().min(1, "Nickname is required").max(50, "Nickname cannot exceed 50 characters");
const nicknameTypedSchema = toTypedSchema(nicknameSchema);

const {
	value: myNickname,
	errorMessage: myNicknameErrorMessage,
	meta: myNicknameMeta,
	resetField: resetMyNickname,
	validate: validateMyNickname,
} = useField("myNickname", nicknameTypedSchema);
const isMyNicknameUpdating = ref<boolean>(false);
const isMyNicknameClearing = ref<boolean>(false);

async function updateMyNickname() {
	if (!groupId.value || !currentUser.value) return;

	const { valid, value: newNickname } = await validateMyNickname();
	if (!valid || !newNickname) return;

	isMyNicknameUpdating.value = true;

	try {
		await changeUserNickname(groupId.value, currentUser.value.uid, newNickname);
		resetMyNickname({ value: newNickname });

		toast("Nickname Updated", {
			description: "And just like that... a new legend is born!",
		});
	} catch (e) {
		toast.error("Error Updating Name", { description: String(e) });
	}

	isMyNicknameUpdating.value = false;
}

async function clearMyNickname() {
	if (!groupId.value || !currentUser.value) return;

	isMyNicknameClearing.value = true;

	try {
		await clearUserNickname(groupId.value, currentUser.value.uid);
		resetMyNickname({ value: undefined });

		toast("Nickname Cleared", { description: "No more secret identities." });
	} catch (e) {
		toast.error("Error Updating Name", { description: String(e) });
	}

	isMyNicknameClearing.value = false;
}

const nonHistoricalUsers = computed(() => getStatusUsers(group.value?.users ?? {}, new Set(["active", "left"])));

const memberNewNickname = ref<
	Record<string, { nickname: string | undefined; isUpdating: boolean; errorMessage?: string }>
>({});
const memberNicknamesModifying = computed(() => new Set(Object.keys(memberNewNickname.value)));
const memberNicknamesClearing = ref<Set<String>>(new Set());
const memberIsUpdating = ref<Set<String>>(new Set());

function startMemberRename(userId: string) {
	if (!group.value?.users) return;

	memberNewNickname.value[userId] = {
		nickname: group.value.users[userId].nickname,
		isUpdating: false,
	};
}

async function acceptMemberRename(userId: string) {
	if (!groupId.value) return;

	const newNickname = validateParseMemberName(userId);
	if (!newNickname) return;

	memberNewNickname.value[userId].isUpdating = true;

	try {
		await changeUserNickname(groupId.value, userId, newNickname);

		toast(`${newNickname}'s Nickname Updated`, {
			description: "Identity crisis averted.",
		});
	} catch (e) {
		toast.error(`Error Updating ${group.value?.users?.[userId].computed.name ?? "Unloaded"}'s Name`, {
			description: String(e),
		});
	}

	// memberNewNickname.value[userId].isUpdating = false;
	delete memberNewNickname.value[userId];
}

function cancelMemberRename(userId: string) {
	delete memberNewNickname.value[userId];
}

function validateParseMemberName(userId: string): string | undefined {
	const { data: nickname, error } = nicknameSchema.safeParse(memberNewNickname.value[userId].nickname);
	memberNewNickname.value[userId].errorMessage = error?.issues[0]?.message;
	return nickname;
}

async function clearMemberNickname(userId: string) {
	if (!groupId.value) return;

	memberNicknamesClearing.value.add(userId);

	try {
		await clearUserNickname(groupId.value, userId);
		toast(`${group.value?.users?.[userId].public?.name ?? "Unloaded"}'s Nickname Cleared`, {
			description: "The disguise has been removed.",
		});
	} catch (e) {
		toast.error(`Error Updating ${group.value?.users?.[userId].computed.name ?? "Unloaded"}'s Name`, {
			description: String(e),
		});
	}

	memberNicknamesClearing.value.delete(userId);
}

const promoteDialog = useControlledDialog<{ userId: string }>();

async function promoteMember() {
	if (!groupId.value || !promoteDialog.data.value) return;

	memberIsUpdating.value.add(promoteDialog.data.value.userId);
	promoteDialog.startDialogProcessing();

	try {
		await promoteUser(groupId.value, promoteDialog.data.value.userId);
		toast(`${group.value?.users?.[promoteDialog.data.value.userId].computed.name ?? "Unloaded"} Promoted`, {
			description: "Long live the new king.",
		});
	} catch (e) {
		toast.error(
			`Error Promoting ${group.value?.users?.[promoteDialog.data.value.userId ?? "Unloaded"].computed.name}`,
			{
				description: String(e),
			},
		);
	}

	memberIsUpdating.value.delete(promoteDialog.data.value.userId);
	promoteDialog.closeDialog();
}

const removeDialog = useControlledDialog<{ userId: string }>();

async function removeMember() {
	if (!groupId.value || !removeDialog.data.value) return;

	memberIsUpdating.value.add(removeDialog.data.value.userId);
	removeDialog.startDialogProcessing();

	try {
		await removeUser(groupId.value, removeDialog.data.value.userId);
		toast(`Removed ${group.value?.users?.[removeDialog.data.value.userId].computed.name ?? "Unloaded"}`, {
			description: "They've been erased from existence... well, at least the group.",
		});
	} catch (e) {
		toast.error(`Error Removing ${group.value?.users?.[removeDialog.data.value.userId].computed.name ?? "Unloaded"}`, {
			description: String(e),
		});
	}

	memberIsUpdating.value.delete(removeDialog.data.value.userId);
	removeDialog.startDialogProcessing();
}

const isAddingMember = ref<boolean>(false);

async function addMember() {
	if (!groupId.value || !group.value?.data) return;

	isAddingMember.value = true;

	try {
		await inviteUser(groupId.value, group.value.data.name);
	} catch (e) {
		toast.error("Error Creating Invite Link", { description: String(e) });
	}

	isAddingMember.value = false;
}

const leaveDialog = useControlledDialog();

async function leaveGroup() {
	if (!groupId.value) return;

	leaveDialog.startDialogProcessing();

	try {
		await firestoreLeaveGroup(groupId.value);

		router.push("/");
		toast("Group Left", { description: "Your expenses here are now history." });
	} catch (e) {
		toast.error("Error Leaving Group", { description: String(e) });
	}

	leaveDialog.closeDialog();
}

const deleteDialog = useControlledDialog();

async function deleteGroup() {
	if (!groupId.value) return;

	deleteDialog.startDialogProcessing();

	try {
		await firestoreDeleteGroup(groupId.value);

		router.push("/");
		toast("Group Deleted", { description: "All data related to this group has been deleted." });
	} catch (e) {
		toast.error("Error Deleting Group", { description: String(e) });
	}

	deleteDialog.closeDialog();
}
</script>

<template>
	<div>
		<div class="mx-auto w-full max-w-2xl flex flex-col gap-4">
			<div class="flex justify-between items-center">
				<div class="flex items-center gap-1">
					<Button variant="ghost" size="icon" @click="router.push(`/group/${groupId}`)">
						<ArrowLeft class="!size-5.5" />
					</Button>
					<span class="text-lg font-semibold">Group Settings</span>
				</div>
				<YourAccountSettings />
			</div>

			<GroupDetailsForm
				ref="groupDetailsForm"
				:new-group="false"
				:initial-loading="!hasGroupDataLoaded"
				:updating="isGroupDetailsUpdating"
				@submit="updateGroup"
			/>

			<Card>
				<CardHeader>
					<CardTitle>Your Group Profile</CardTitle>
					<CardDescription>How others see you in this group</CardDescription>
				</CardHeader>
				<CardContent class="flex flex-col gap-3">
					<div v-if="currentGroupUser" class="flex items-center gap-2 bg-muted w-fit min-w-1/3 rounded-lg py-2 px-4">
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
							<span v-if="group?.data" class="text-sm text-muted-foreground">
								{{ currentUser!.uid === group.data.owner ? "Owner" : "Member" }}
							</span>
							<!-- Use margin to produce a gap between skeletons -->
							<Skeleton v-else class="w-16 h-4 mt-1" />
						</div>
					</div>
					<Skeleton v-else class="w-46 h-10" />

					<Field :data-invalid="!!myNicknameErrorMessage">
						<div class="flex items-center gap-1">
							<FieldLabel for="myNickname" :disabled="isMyNicknameUpdating">Your Nickname</FieldLabel>
							<Dot v-if="currentGroupUser?.nickname || isMyNicknameClearing" class="size-4 text-muted-foreground" />
							<Button
								v-if="currentGroupUser?.nickname || isMyNicknameClearing"
								variant="link"
								:disabled="isMyNicknameUpdating || isMyNicknameClearing"
								class="h-5 p-0 text-sm text-muted-foreground"
								@click="clearMyNickname"
							>
								Clear Nickname
							</Button>
							<LoaderCircle v-if="isMyNicknameClearing" class="size-4 text-muted-foreground animate-spin" />
						</div>
						<div class="flex gap-2">
							<InputGroup v-if="hasGroupUsersLoaded">
								<InputGroupInput id="myNickname" placeholder="Nickname" v-model="myNickname" />
								<InputGroupAddon>
									<UserRound class="size-4" />
								</InputGroupAddon>
							</InputGroup>
							<Skeleton v-else class="w-full h-9" />
							<Button
								:disabled="
									isMyNicknameUpdating ||
									isMyNicknameClearing ||
									!myNicknameMeta.valid ||
									!myNicknameMeta.dirty ||
									!hasGroupUsersLoaded
								"
								class="w-fit"
								@click="updateMyNickname"
							>
								<LoaderIcon :icon="Check" :loading="isMyNicknameUpdating" />
								<span>Update</span>
							</Button>
						</div>
						<FieldError v-if="myNicknameErrorMessage">{{ myNicknameErrorMessage }}</FieldError>
					</Field>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Members</CardTitle>
					<CardDescription>
						View {{ currentUser?.uid === group?.data?.owner && "and manage" }} group members
					</CardDescription>
				</CardHeader>
				<CardContent class="flex flex-col gap-2">
					<template v-if="group?.users">
						<div v-for="(user, userId) in nonHistoricalUsers" class="flex flex-col gap-2">
							<div class="flex justify-between items-center gap-2">
								<div class="flex flex-1 items-center gap-2">
									<Avatar
										v-if="user.computed.name"
										:src="user.public?.photoUrl ?? null"
										:name="user.computed.name"
										:class="`size-9 ${user.status === 'left' && 'opacity-70'}`"
									/>
									<Skeleton v-else class="size-9 rounded-full" />
									<div v-if="!memberNicknamesModifying.has(userId)" class="flex flex-col">
										<span v-if="user.computed.name" :class="`${user.status === 'left' && 'text-muted-foreground'}`">
											{{ user.computed.name }}
										</span>
										<Skeleton v-else class="w-22 h-6" />
										<span
											v-if="group.data"
											:class="`text-sm text-muted-foreground ${user.status !== 'active' && 'italic'}`"
										>
											{{ user.status === "active" ? (userId === group.data.owner ? "Owner" : "Member") : "Left Group" }}
										</span>
										<Skeleton v-else class="w-16 h-4 mt-1" />
									</div>
									<div v-else class="flex-1 flex gap-2">
										<Input
											v-model="memberNewNickname[userId].nickname"
											:placeholder="user.public?.name ?? 'Name'"
											:disabled="memberNewNickname[userId].isUpdating"
											@update:model-value="validateParseMemberName(userId)"
										/>
										<div class="flex gap-1">
											<Button
												class="size-9"
												@click="acceptMemberRename(userId)"
												:disabled="memberNewNickname[userId].isUpdating || memberNewNickname[userId].errorMessage"
											>
												<LoaderIcon :icon="Check" :loading="memberNewNickname[userId].isUpdating" />
											</Button>
											<Button
												variant="outline"
												class="size-9"
												@click="cancelMemberRename(userId)"
												:disabled="memberNewNickname[userId].isUpdating"
											>
												<X />
											</Button>
										</div>
									</div>
								</div>
								<DropdownMenu
									v-if="group.data && currentUser?.uid === group.data.owner && !memberNicknamesModifying.has(userId)"
								>
									<DropdownMenuTrigger as-child>
										<Button variant="outline" :disabled="userId === group.data.owner || memberIsUpdating.has(userId)">
											<LoaderIcon
												v-if="userId !== group.data.owner"
												:icon="ChevronDown"
												:loading="memberIsUpdating.has(userId)"
											/>
											<span>
												{{ userId === group.data.owner ? "Owner" : "Actions" }}
											</span>
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent>
										<DropdownMenuItem
											@click="startMemberRename(userId)"
											:disabled="
												memberNewNickname[userId]?.isUpdating ||
												memberNicknamesClearing.has(userId) ||
												memberIsUpdating.has(userId)
											"
										>
											<div class="flex items-center gap-2">
												<Pencil class="!size-4" />
												<span>Rename</span>
											</div>
										</DropdownMenuItem>
										<DropdownMenuItem
											@click="clearMemberNickname(userId)"
											:disabled="!user.nickname || memberNicknamesClearing.has(userId)"
										>
											<div class="flex items-center gap-2">
												<CircleX class="!size-4" />
												<span>Clear Nickname</span>
											</div>
										</DropdownMenuItem>
										<DropdownMenuItem
											@click="promoteDialog.openDialog({ userId })"
											:disabled="user.status !== 'active'"
										>
											<div class="flex items-center gap-2">
												<ArrowBigUpDash class="!size-4" />
												<span>Promote</span>
											</div>
										</DropdownMenuItem>
										<DropdownMenuSeparator />
										<DropdownMenuItem @click="removeDialog.openDialog({ userId })" :disabled="user.status !== 'active'">
											<div class="flex items-center gap-2">
												<UserMinus class="text-destructive !size-4" />
												<span class="text-destructive">Remove</span>
											</div>
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
							<span v-if="memberNewNickname[userId]?.errorMessage" class="ml-11 text-sm text-destructive font-normal">
								{{ memberNewNickname[userId].errorMessage }}
							</span>
						</div>
					</template>
					<Skeleton v-else v-for="_ in 4" class="w-52 h-11" />
				</CardContent>
				<CardFooter>
					<Button variant="secondary" :disabled="isAddingMember" class="w-full" @click="addMember">
						<LoaderIcon :icon="UserRoundPlus" :loading="isAddingMember" />
						<span>Add Member</span>
					</Button>
				</CardFooter>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Danger Zone</CardTitle>
					<CardDescription>Dangerous action for this group</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="flex flex-col gap-4">
						<div class="flex justify-between items-center gap-2">
							<div class="flex flex-col gap-1">
								<span>Leave Group</span>
								<span class="text-sm text-muted-foreground">Remove yourself from this group</span>
							</div>
							<Button variant="outline" @click="leaveDialog.openDialog">
								<LogOut />
								<span>Leave</span>
							</Button>
						</div>

						<template v-if="group?.data && currentUser?.uid === group.data.owner">
							<Separator />
							<div v-if="currentUser?.uid === group.data.owner" class="flex justify-between items-center gap-2">
								<div class="flex flex-col gap-1">
									<span>Delete Group</span>
									<span class="text-sm text-muted-foreground">Permanently delete this group and all its data</span>
								</div>
								<Button variant="destructive" @click="deleteDialog.openDialog">
									<Trash />
									<span>Delete</span>
								</Button>
							</div>
						</template>
					</div>
				</CardContent>
			</Card>

			<Dialog v-model:open="promoteDialog.open.value">
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Are you absolutely sure?</DialogTitle>
						<DialogDescription class="flex items-center gap-1">
							<span>Promoting</span>
							<span v-if="group?.users" class="font-semibold">
								{{ group.users[promoteDialog.data.value!.userId].computed.name }}
							</span>
							<Skeleton v-else class="inline-block w-14 h-4.25" />
							<span>will change your role to member.</span>
						</DialogDescription>
					</DialogHeader>
					<DialogFooter class="gap-2">
						<Button variant="outline" :disabled="promoteDialog.processing.value" @click="promoteDialog.closeDialog">
							Cancel
						</Button>
						<Button :disabled="promoteDialog.processing.value" @click="promoteMember">
							<LoaderIcon :icon="ArrowBigUpDash" :loading="promoteDialog.processing.value" />
							<span>Promote</span>
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog v-model:open="removeDialog.open.value">
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Are you absolutely sure?</DialogTitle>
						<DialogDescription class="flex items-center gap-1">
							<span v-if="group?.users" class="font-semibold">
								{{ group.users[removeDialog.data.value!.userId].computed.name }}
							</span>
							<Skeleton v-else class="inline-block w-14 h-4.25" />
							<span>will require an invite to return.</span>
						</DialogDescription>
					</DialogHeader>
					<DialogFooter class="gap-2">
						<Button variant="outline" :disabled="removeDialog.processing.value" @click="removeDialog.closeDialog">
							Cancel
						</Button>
						<Button variant="destructive" :disabled="removeDialog.processing.value" @click="removeMember">
							<LoaderIcon :icon="UserMinus" :loading="removeDialog.processing.value" />
							<span>Remove</span>
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog v-model:open="leaveDialog.open.value">
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Are you absolutely sure?</DialogTitle>
						<DialogDescription>Your data will remain in the group until all debts are resolved.</DialogDescription>
					</DialogHeader>
					<DialogFooter class="gap-2">
						<Button variant="outline" :disabled="leaveDialog.processing.value" @click="leaveDialog.closeDialog">
							Cancel
						</Button>
						<Button :disabled="leaveDialog.processing.value" @click="leaveGroup">
							<LoaderIcon :icon="LogOut" :loading="leaveDialog.processing.value" />
							<span>Leave</span>
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog v-model:open="deleteDialog.open.value">
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Are you absolutely sure?</DialogTitle>
						<DialogDescription>
							This action cannot be undone. This will permanently delete the group and all its data.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter class="gap-2">
						<Button variant="outline" :disabled="deleteDialog.processing.value" @click="deleteDialog.closeDialog">
							Cancel
						</Button>
						<Button variant="destructive" :disabled="deleteDialog.processing.value" @click="deleteGroup">
							<LoaderIcon :icon="Trash" :loading="deleteDialog.processing.value" />
							<span>Delete</span>
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	</div>
</template>
