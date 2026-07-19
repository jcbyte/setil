<script setup lang="ts">
import Avatar from "@/components/Avatar.vue";
import LoaderIcon from "@/components/LoaderIcon.vue";
import Button from "@/components/ui/button/Button.vue";
import { Input } from "@/components/ui/input";
import YourAccountSettings from "@/components/YourAccountSettings.vue";
import { ArrowLeft, Check, ChevronRight, UserRound } from "@lucide/vue";
import { ref } from "vue";
import { useRouter } from "vue-router";
import * as z from "zod";

const router = useRouter();

const displayName = ref<string | undefined>();
const displayNameErrors = ref<string | undefined>();
const displayNameValidation = z.string().min(1, "Name is required").max(50, "Name cannot exceed 50 characters");

function validateDisplayName() {
	const parsedName = displayNameValidation.safeParse(displayName.value);
	displayNameErrors.value = parsedName.success ? undefined : parsedName.error.issues[0].message;
}

const isDisplayNameUpdating = ref<boolean>(false);

function updateName() {}

const B64_EG =
	"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAApgAAAKYB3X3/OAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAANCSURBVEiJtZZPbBtFFMZ/M7ubXdtdb1xSFyeilBapySVU8h8OoFaooFSqiihIVIpQBKci6KEg9Q6H9kovIHoCIVQJJCKE1ENFjnAgcaSGC6rEnxBwA04Tx43t2FnvDAfjkNibxgHxnWb2e/u992bee7tCa00YFsffekFY+nUzFtjW0LrvjRXrCDIAaPLlW0nHL0SsZtVoaF98mLrx3pdhOqLtYPHChahZcYYO7KvPFxvRl5XPp1sN3adWiD1ZAqD6XYK1b/dvE5IWryTt2udLFedwc1+9kLp+vbbpoDh+6TklxBeAi9TL0taeWpdmZzQDry0AcO+jQ12RyohqqoYoo8RDwJrU+qXkjWtfi8Xxt58BdQuwQs9qC/afLwCw8tnQbqYAPsgxE1S6F3EAIXux2oQFKm0ihMsOF71dHYx+f3NND68ghCu1YIoePPQN1pGRABkJ6Bus96CutRZMydTl+TvuiRW1m3n0eDl0vRPcEysqdXn+jsQPsrHMquGeXEaY4Yk4wxWcY5V/9scqOMOVUFthatyTy8QyqwZ+kDURKoMWxNKr2EeqVKcTNOajqKoBgOE28U4tdQl5p5bwCw7BWquaZSzAPlwjlithJtp3pTImSqQRrb2Z8PHGigD4RZuNX6JYj6wj7O4TFLbCO/Mn/m8R+h6rYSUb3ekokRY6f/YukArN979jcW+V/S8g0eT/N3VN3kTqWbQ428m9/8k0P/1aIhF36PccEl6EhOcAUCrXKZXXWS3XKd2vc/TRBG9O5ELC17MmWubD2nKhUKZa26Ba2+D3P+4/MNCFwg59oWVeYhkzgN/JDR8deKBoD7Y+ljEjGZ0sosXVTvbc6RHirr2reNy1OXd6pJsQ+gqjk8VWFYmHrwBzW/n+uMPFiRwHB2I7ih8ciHFxIkd/3Omk5tCDV1t+2nNu5sxxpDFNx+huNhVT3/zMDz8usXC3ddaHBj1GHj/As08fwTS7Kt1HBTmyN29vdwAw+/wbwLVOJ3uAD1wi/dUH7Qei66PfyuRj4Ik9is+hglfbkbfR3cnZm7chlUWLdwmprtCohX4HUtlOcQjLYCu+fzGJH2QRKvP3UNz8bWk1qMxjGTOMThZ3kvgLI5AzFfo379UAAAAASUVORK5CYII=";
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
						<span :class="`text-sm font-[500] ${displayNameErrors && 'text-destructive'}`"
							>Profile Photo (TODO UX)</span
						>
						<div>
							<Avatar :src="B64_EG" name="Eg" class="size-14" />
							<Button>Update?</Button>
						</div>
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
