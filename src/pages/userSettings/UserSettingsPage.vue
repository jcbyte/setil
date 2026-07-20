<script setup lang="ts">
import { uploadAvatar } from "@/cloudinary/avatar";
import Avatar from "@/components/Avatar.vue";
import LoaderIcon from "@/components/LoaderIcon.vue";
import Button from "@/components/ui/button/Button.vue";
import { Input } from "@/components/ui/input";
import YourAccountSettings from "@/components/YourAccountSettings.vue";
import { getUserData, setName } from "@/firebase/firestore/user";
import { ArrowLeft, Camera, Check, ChevronRight, CircleX, UserRound } from "@lucide/vue";
import { onMounted, ref } from "vue";
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

onMounted(async () => {
	const userData = await getUserData();

	displayName.value = userData.public.name;
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

	// todo file size validation:
	// if (file.size)

	isAvatarUpdating.value = true;

	try {
		await uploadAvatar(file);

		toast("Profile Picture Updated", { description: "Glow-up complete" });
	} catch (e) {
		toast.error("Error Updating Profile Picture", { description: String(e) });
	}

	isAvatarUpdating.value = false;
}

async function handleClearAvatar() {
	isAvatarClearing.value = true;

	// todo clearing photo

	isAvatarClearing.value = false;
}

// todo crop photo to circle selection ??
const B64_EG =
	"data:image/jpeg;base64,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";
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

					<div class="flex justify-between items-center gap-3">
						<div class="flex flex-col gap-2">
							<div class="flex flex-col">
								<span class="text-sm font-[500]">Profile Picture</span>
								<span class="text-[12.8px] text-muted-foreground">Select an image under 1 MB </span>
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
						<Avatar :src="B64_EG" name="Example Name" class="size-20 border-2 border-background ring-1 ring-border" />
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
	</div>
</template>
