<script setup lang="ts">
import { Button } from "@/components/ui/button";
import YourAccountSettings from "@/components/YourAccountSettings.vue";
import { createGroup as firestoreCreateGroup } from "@/firebase/firestore/group";
import type { Currency } from "@/types/firestore";
import { ArrowLeft } from "@lucide/vue";
import { Timestamp } from "firebase/firestore";
import { ref } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { toast } from "vue-sonner";
import GroupDetailsForm, { type GroupDetailsValues } from "./GroupDetailsForm.vue";

const router = useRouter();

const isGroupCreating = ref<boolean>(false);

async function createGroup(details: GroupDetailsValues) {
	isGroupCreating.value = true;

	try {
		const newGroupId = await firestoreCreateGroup({
			name: details.name,
			description: details.description ?? null,
			currency: details.currency as Currency,
			lastUpdate: Timestamp.now(),
		});

		toast("Group Created", { description: "A fellowship of finances has been forged." });
		router.push(`/group/${newGroupId}`);
	} catch (e) {
		toast.error("Error Creating Group", { description: String(e) });
	}

	isGroupCreating.value = false;
}
</script>

<template>
	<div>
		<div class="mx-auto w-full max-w-2xl flex flex-col gap-4">
			<div class="flex justify-between items-center">
				<div class="flex items-center gap-1">
					<RouterLink to="/">
						<Button type="button" variant="ghost" size="icon">
							<ArrowLeft class="size-5.5" />
						</Button>
					</RouterLink>
					<span class="text-lg font-semibold">Create Group</span>
				</div>
				<YourAccountSettings />
			</div>

			<GroupDetailsForm :new-group="true" :updating="isGroupCreating" @submit="createGroup" />
		</div>
	</div>
</template>
