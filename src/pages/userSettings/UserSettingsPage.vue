<script setup lang="ts">
import { removeAvatar, uploadAvatar } from "@/cloudinary/avatar";
import Avatar from "@/components/Avatar.vue";
import LoaderIcon from "@/components/LoaderIcon.vue";
import Button from "@/components/ui/button/Button.vue";
import { Dialog } from "@/components/ui/dialog";
import DialogClose from "@/components/ui/dialog/DialogClose.vue";
import DialogContent from "@/components/ui/dialog/DialogContent.vue";
import DialogDescription from "@/components/ui/dialog/DialogDescription.vue";
import DialogFooter from "@/components/ui/dialog/DialogFooter.vue";
import DialogHeader from "@/components/ui/dialog/DialogHeader.vue";
import DialogTitle from "@/components/ui/dialog/DialogTitle.vue";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import YourAccountSettings from "@/components/YourAccountSettings.vue";
import { getUserData, setName } from "@/firebase/firestore/user";
import {
	ArrowLeft,
	Camera,
	Check,
	ChevronRight,
	CircleX,
	Crop,
	Monitor,
	Moon,
	SunMedium,
	UserRound,
	type LucideProps,
} from "@lucide/vue";
import { useColorMode, type BasicColorSchema } from "@vueuse/core";
import { onMounted, ref, type FunctionalComponent } from "vue";
import { CircleStencil, Cropper } from "vue-advanced-cropper";
import "vue-advanced-cropper/dist/style.css";
import { useRouter } from "vue-router";
import { toast } from "vue-sonner";
import * as z from "zod";

const router = useRouter();

const displayName = ref<string | undefined>();
const displayNameErrors = ref<string | undefined>();
const displayNameValidation = z.string().min(1, "Name is required").max(50, "Name cannot exceed 50 characters");

function validateDisplayName() {
	const parsedName = displayNameValidation.safeParse(displayName.value);
	displayNameErrors.value = parsedName.success ? undefined : parsedName.error.issues[0].message;
}

const avatarSrc = ref<string | undefined>();
const avatarErrors = ref<string | undefined>();

const isCropperOpen = ref(false);
const newAvatarSrc = ref<string | undefined>();
const avatarCropper = ref<InstanceType<typeof Cropper> | undefined>();

onMounted(async () => {
	const userData = await getUserData();

	displayName.value = userData.public.name;
	avatarSrc.value = userData.public.photoUrl;
});

const isDisplayNameUpdating = ref<boolean>(false);

async function updateName() {
	const cleanName = displayName.value?.trim();
	if (!cleanName) return;

	isDisplayNameUpdating.value = true;

	try {
		await setName(cleanName);

		toast("Name Updated", { description: "Please try not to forget it." });
	} catch (e) {
		toast.error("Error Updating Name", { description: String(e) });
	}

	isDisplayNameUpdating.value = false;
}

const avatarFileInput = ref<HTMLInputElement | null>(null);
const isAvatarUpdating = ref<boolean>(false);
const isAvatarClearing = ref<boolean>(false);

async function handleAvatarFileChange(event: Event) {
	const file = (event.target as HTMLInputElement).files?.[0];
	if (!file) return;

	// Check file size
	if (file.size > 1024 * 1024 * 4) {
		avatarErrors.value = "The selected file exceeds 4 MB";
		return;
	}
	avatarErrors.value = undefined;

	newAvatarSrc.value = URL.createObjectURL(file);
	if (avatarFileInput.value) avatarFileInput.value.value = "";

	isCropperOpen.value = true;
}

function cleanupCloseCropper() {
	if (newAvatarSrc.value) {
		URL.revokeObjectURL(newAvatarSrc.value);
		newAvatarSrc.value = undefined;
	}

	isCropperOpen.value = false;
}

async function handleAvatarSave() {
	if (!avatarCropper.value) return;

	const { canvas } = avatarCropper.value.getResult();
	if (!canvas) return;

	const file = await new Promise<File>((resolve, reject) => {
		canvas.toBlob((blob) => {
			if (!blob) {
				reject(new Error("Cannot extract bloc from canvas"));
				return;
			}
			resolve(new File([blob], "avatar.jpg", { type: "image/jpeg" }));
		}, "image/jpeg");
	});

	isAvatarUpdating.value = true;
	cleanupCloseCropper();

	try {
		const savedPhotoUrl = await uploadAvatar(file);
		avatarSrc.value = savedPhotoUrl;

		toast("Profile Picture Updated", { description: "Glow-up complete" });
	} catch (e) {
		toast.error("Error Updating Profile Picture", { description: String(e) });
	}

	isAvatarUpdating.value = false;
}

async function handleClearAvatar() {
	isAvatarClearing.value = true;

	try {
		await removeAvatar();
		avatarSrc.value = undefined;

		toast("Profile Picture Removed", { description: "The paparazzi are devastated" });
	} catch (e) {
		toast.error("Error Updating Profile Picture", { description: String(e) });
	}

	isAvatarClearing.value = false;
}

const selectedTheme = useColorMode().store;
const themeDetail: Record<BasicColorSchema, { name: string; icon: FunctionalComponent<LucideProps, {}, any, {}> }> = {
	light: { name: "Light", icon: SunMedium },
	dark: { name: "Dark", icon: Moon },
	auto: { name: "System", icon: Monitor },
};
</script>

<template>
	<div>
		<div class="w-full flex flex-col gap-4 items-center">
			<div class="w-full flex justify-between items-center">
				<div class="flex gap-2 justify-center items-center">
					<Button variant="ghost" class="size-9" @click="router.back()">
						<ArrowLeft class="!size-6" />
					</Button>
					<span class="text-lg font-semibold">User Settings</span>
				</div>
				<YourAccountSettings />
			</div>

			<div class="w-full max-w-[32rem] flex flex-col gap-4">
				<div class="border border-border rounded-lg flex flex-col gap-6 p-4">
					<div class="flex flex-col">
						<span class="text-lg font-semibold">Profile</span>
						<span class="text-sm text-muted-foreground">How you are seen by others</span>
					</div>

					<div class="flex flex-col gap-2">
						<span :class="`text-sm font-[500] ${displayNameErrors && 'text-destructive'}`">Display Name</span>
						<div class="flex justify-center items-center gap-2">
							<div class="relative w-full">
								<Input
									v-model:model-value="displayName"
									class="pl-8"
									autocomplete="off"
									type="text"
									placeholder="Name"
									:disabled="isDisplayNameUpdating"
									@update:model-value="validateDisplayName"
								/>
								<span class="absolute left-0 inset-y-0 flex items-center justify-center px-2 text-muted-foreground">
									<UserRound class="size-4" />
								</span>
							</div>
							<Button type="button" :disabled="isDisplayNameUpdating" class="w-fit" @click="updateName">
								<LoaderIcon :icon="Check" :loading="isDisplayNameUpdating" />
								<span>Update</span>
							</Button>
						</div>
						<span class="text-[12.8px] text-muted-foreground"> You can use a different nickname in each group </span>
						<span v-if="displayNameErrors" class="text-[12.8px] text-destructive">{{ displayNameErrors }}</span>
					</div>

					<div class="flex flex-col gap-2">
						<div class="flex justify-between items-center gap-3">
							<div class="flex flex-col gap-2">
								<div class="flex flex-col">
									<span class="text-sm font-[500]">Profile Picture</span>
									<span class="text-[12.8px] text-muted-foreground">Select an image under 4 MB </span>
								</div>
								<div class="flex gap-2">
									<Button
										type="button"
										:disabled="isAvatarUpdating || isAvatarClearing"
										@click="() => avatarFileInput?.click()"
									>
										<LoaderIcon :icon="Camera" :loading="isAvatarUpdating" />
										<span>Upload</span>
									</Button>
									<!-- Hidden file input for avatar upload -->
									<input
										type="file"
										ref="avatarFileInput"
										accept="image/*"
										style="display: none"
										@change="handleAvatarFileChange"
									/>
									<Button
										v-if="avatarSrc"
										type="button"
										variant="outline"
										:disabled="isAvatarUpdating || isAvatarClearing"
										@click="handleClearAvatar"
									>
										<LoaderIcon :icon="CircleX" :loading="isAvatarClearing" />
										<span>Remove</span>
									</Button>
								</div>
							</div>
							<Avatar
								:src="avatarSrc ?? null"
								:name="displayName ?? ''"
								class="size-20 border-2 border-background ring-1 ring-border"
							/>
						</div>
						<span v-if="avatarErrors" class="text-[12.8px] text-destructive">{{ avatarErrors }}</span>
					</div>
				</div>
			</div>

			<div class="w-full max-w-[32rem] flex flex-col gap-4">
				<div class="border border-border rounded-lg flex flex-col gap-6 p-4">
					<div class="flex flex-col">
						<span class="text-lg font-semibold">Appearance</span>
						<span class="text-sm text-muted-foreground">Personalise how Setil looks</span>
					</div>

					<div class="flex justify-between items-center gap-2">
						<div class="flex flex-col">
							<span class="text-sm font-[500]">Theme</span>
							<span class="text-[12.8px] text-muted-foreground text-nowrap">Choose your colour scheme</span>
						</div>
						<Select v-model="selectedTheme">
							<SelectTrigger class="w-full max-w-38">
								<div v-if="selectedTheme" class="flex items-center gap-2">
									<component :is="themeDetail[selectedTheme].icon" class="size-4" />
									<span>{{ themeDetail[selectedTheme].name }}</span>
								</div>
							</SelectTrigger>
							<SelectContent align="center">
								<SelectItem v-for="(detail, theme) in themeDetail" :key="theme" :value="theme">
									<div class="flex items-center gap-2">
										<component :is="detail.icon" class="size-4" />
										<span>{{ detail.name }}</span>
									</div>
								</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
			</div>

			<div class="w-full max-w-[32rem] flex flex-col gap-4" @click="router.push('/settings/payment')">
				<div class="border border-border rounded-lg flex justify-between items-center p-4">
					<div class="flex flex-col">
						<span class="text-lg font-semibold">Payment Details</span>
						<span class="text-sm text-muted-foreground">Add or update your payment details</span>
					</div>
					<ChevronRight />
				</div>
			</div>
		</div>

		<Dialog :open="isCropperOpen" @update:open="(opened) => !opened && cleanupCloseCropper()">
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Crop Profile Picture</DialogTitle>
					<DialogDescription>Adjust to frame your profile picture</DialogDescription>
				</DialogHeader>

				<div class="flex items-center justify-center w-full max-h-[60vh] overflow-hidden rounded-md">
					<Cropper
						ref="avatarCropper"
						:src="newAvatarSrc"
						:stencil-component="CircleStencil"
						:stencil-props="{ aspectRatio: 1 }"
					/>
				</div>

				<DialogFooter>
					<DialogClose as-child>
						<Button variant="outline" type="button" :disabled="isAvatarUpdating">Cancel</Button>
					</DialogClose>
					<Button type="button" :disabled="isAvatarUpdating" @click="handleAvatarSave">
						<LoaderIcon :icon="Crop" :loading="isAvatarUpdating" />
						<span>Done</span>
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	</div>
</template>
