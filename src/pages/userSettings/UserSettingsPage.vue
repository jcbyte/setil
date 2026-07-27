<script setup lang="ts">
import { removeAvatar, uploadAvatar } from "@/cloudinary/avatar";
import Avatar from "@/components/Avatar.vue";
import LoaderIcon from "@/components/LoaderIcon.vue";
import NavCard from "@/components/NavCard.vue";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import YourAccountSettings from "@/components/YourAccountSettings.vue";
import { getUserData, setName } from "@/firebase/firestore/user";
import {
	ArrowLeft,
	Camera,
	Check,
	CircleX,
	Crop,
	LoaderCircle,
	Monitor,
	Moon,
	SunMedium,
	UserRound,
	type LucideProps,
} from "@lucide/vue";
import { toTypedSchema } from "@vee-validate/zod";
import { useColorMode, type BasicColorSchema } from "@vueuse/core";
import { useField } from "vee-validate";
import { onMounted, ref, type FunctionalComponent } from "vue";
import { CircleStencil, Cropper } from "vue-advanced-cropper";
import "vue-advanced-cropper/dist/style.css";
import { useRouter } from "vue-router";
import { toast } from "vue-sonner";
import * as z from "zod";

const router = useRouter();

onMounted(() => {
	const originPath = window.history.state?.back;
	if (originPath && !originPath.startsWith("/settings")) {
		sessionStorage.setItem("settings_origin", originPath);
	}
});

function exitSettings() {
	const originPath = sessionStorage.getItem("settings_origin");
	if (originPath) {
		sessionStorage.removeItem("settings_origin");
		router.push(originPath);
	} else {
		// Fallback if /settings was opened directly
		router.push("/");
	}
}

const hasDataLoaded = ref<boolean>(false);

const nameSchema = toTypedSchema(
	z.string().trim().min(1, "Name is required").max(50, "Name cannot exceed 50 characters"),
);
const {
	value: name,
	errorMessage: nameErrorMessage,
	meta: nameMeta,
	resetField: resetName,
	validate: validateName,
} = useField("name", nameSchema);
const isNameUpdating = ref<boolean>(false);

const avatarSrc = ref<string | undefined>();
const avatarErrorMessage = ref<string | undefined>();
const avatarFileInput = ref<HTMLInputElement | null>(null);
const isAvatarUpdating = ref<boolean>(false);
const isAvatarClearing = ref<boolean>(false);
const isCropperOpen = ref(false);
const newAvatarSrc = ref<string | undefined>();
const avatarCropper = ref<InstanceType<typeof Cropper> | undefined>();

onMounted(async () => {
	const userData = await getUserData();

	resetName({ value: userData.public.name });
	avatarSrc.value = userData.public.photoUrl;

	hasDataLoaded.value = true;
});

async function updateName() {
	const { valid, value: newName } = await validateName();
	if (!valid || !newName) return;

	isNameUpdating.value = true;

	try {
		await setName(newName);

		toast("Name Updated", { description: "Please try not to forget it." });
	} catch (e) {
		toast.error("Error Updating Name", { description: String(e) });
	}

	resetName({ value: newName });
	isNameUpdating.value = false;
}

async function handleAvatarFileChange(event: Event) {
	const file = (event.target as HTMLInputElement).files?.[0];
	if (!file) return;

	// Check file size
	if (file.size > 1024 * 1024 * 5) {
		avatarErrorMessage.value = "The selected file exceeds 5 MB";
		return;
	}
	avatarErrorMessage.value = undefined;

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
		<div class="mx-auto w-full max-w-2xl flex flex-col gap-4">
			<div class="flex justify-between items-center">
				<div class="flex items-center gap-1">
					<Button type="button" variant="ghost" size="icon" @click="exitSettings">
						<ArrowLeft class="size-5.5" />
					</Button>
					<span class="text-lg font-semibold">User Settings</span>
				</div>
				<YourAccountSettings />
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Profile</CardTitle>
					<CardDescription>How you're seen by others</CardDescription>
				</CardHeader>
				<CardContent>
					<FieldGroup>
						<Field :data-invalid="!!nameErrorMessage">
							<FieldLabel for="name" :disabled="isNameUpdating">Name</FieldLabel>
							<div class="flex gap-2">
								<InputGroup v-if="hasDataLoaded">
									<InputGroupInput id="name" placeholder="Name" v-model="name" />
									<InputGroupAddon>
										<UserRound class="size-4" />
									</InputGroupAddon>
								</InputGroup>
								<Skeleton v-else class="w-full h-9" />
								<Button
									type="button"
									:disabled="isNameUpdating || !nameMeta.valid || !nameMeta.dirty || !hasDataLoaded"
									class="w-fit"
									@click="updateName"
								>
									<LoaderIcon :icon="Check" :loading="isNameUpdating" />
									<span>Update</span>
								</Button>
							</div>
							<FieldDescription>You can use a different nickname in each group</FieldDescription>
							<FieldError v-if="nameErrorMessage">{{ nameErrorMessage }}</FieldError>
						</Field>

						<div class="flex justify-between items-center gap-2">
							<Field>
								<FieldLabel>Profile Picture</FieldLabel>
								<div class="flex gap-2">
									<Button
										type="button"
										:disabled="isAvatarUpdating || isAvatarClearing || !hasDataLoaded"
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
										v-if="avatarSrc || isAvatarClearing"
										type="button"
										variant="secondary"
										:disabled="isAvatarUpdating || isAvatarClearing || !hasDataLoaded"
										@click="handleClearAvatar"
									>
										<LoaderIcon :icon="CircleX" :loading="isAvatarClearing" />
										<span>Remove</span>
									</Button>
								</div>
								<FieldDescription>Select an image under 5 MB</FieldDescription>

								<FieldError v-if="avatarErrorMessage">{{ avatarErrorMessage }}</FieldError>
							</Field>
							<div class="relative flex justify-center items-center">
								<Avatar
									v-if="hasDataLoaded"
									:src="avatarSrc ?? null"
									:name="name ?? ''"
									class="size-20 border-2 border-background ring-1 ring-border"
								/>
								<Skeleton v-else class="size-20 rounded-full" />
								<div
									v-if="isAvatarUpdating || isAvatarClearing"
									class="absolute inset-0 flex justify-center items-center rounded-full bg-black/40 backdrop-blur-[3px]"
								>
									<LoaderCircle class="size-6 animate-spin text-white" />
								</div>
							</div>
						</div>
					</FieldGroup>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Appearance</CardTitle>
					<CardDescription>Personalise how Setil looks</CardDescription>
				</CardHeader>
				<CardContent>
					<Field class="flex flex-row justify-between items-center">
						<div class="space-y-1">
							<FieldLabel for="theme">Theme</FieldLabel>
							<FieldDescription>Choose your colour scheme</FieldDescription>
						</div>

						<Select v-model="selectedTheme">
							<SelectTrigger id="theme" class="w-full max-w-38">
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
					</Field>
				</CardContent>
			</Card>

			<NavCard to="/settings/payment">
				<CardHeader>
					<CardTitle>Payment Details</CardTitle>
					<CardDescription>Add or update your payment details</CardDescription>
				</CardHeader>
			</NavCard>
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
						<Button type="button" variant="outline" :disabled="isAvatarUpdating">Cancel</Button>
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
