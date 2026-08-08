<script setup lang="ts">
import { Card, CardContent } from "@/components/ui/card";
import { joinGroup } from "@/firebase/firestore/group";
import { sendNotification } from "@/firebase/messaging";
import authService from "@/util/authService";
import { getRouteParam } from "@/util/util";
import { LoaderCircle } from "@lucide/vue";
import { onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { toast } from "vue-sonner";

const route = useRoute();
const router = useRouter();
const { user: currentUser } = authService;

const groupId = getRouteParam(route.params.groupId);
const inviteCode = getRouteParam(route.params.inviteCode);

onMounted(async () => {
	if (!groupId || !inviteCode) {
		toast.error("Invalid Link", {
			description: "Ensure this is a valid link.",
		});
		router.push(`/`);
		return;
	}

	try {
		const joinedNew = await joinGroup(groupId, inviteCode);

		if (joinedNew) {
			toast("Joined Group", { description: "Time to make cents of things." });
			sendNotification(groupId, { type: "joined-group", userId: currentUser.value!.uid });
		}
		router.push(`/group/${groupId}`);
	} catch {
		toast.error("Couldn't Join Group", {
			description: "Ensure this link has not expired.",
			duration: 5000,
		});
		router.push(`/`);
	}
});
</script>

<template>
	<div class="flex h-full w-full items-center justify-center">
		<Card class="-translate-y-8 w-full max-w-sm">
			<CardContent class="flex flex-col items-center gap-6 p-8 sm:p-10 text-center">
				<div class="relative flex size-14 items-center justify-center text-primary">
					<div class="absolute inset-0 blur-xl bg-primary/20" />
					<LoaderCircle class="size-10 animate-spin" />
				</div>

				<div class="flex flex-col items-center gap-2">
					<h1 class="font-heading text-2xl font-extrabold tracking-tight">Joining group</h1>
					<p class="text-sm text-muted-foreground">Validating your invite link...</p>
				</div>
			</CardContent>
		</Card>
	</div>
</template>
