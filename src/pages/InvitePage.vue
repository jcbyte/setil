<script setup lang="ts">
import { Card, CardContent } from "@/components/ui/card";
import { joinGroup } from "@/firebase/firestore/group";
import { sendNotification } from "@/firebase/messaging";
import { getRouteParam } from "@/util/util";
import { Loader } from "@lucide/vue";
import { onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { toast } from "vue-sonner";

const route = useRoute();
const router = useRouter();

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
		const joinRes = await joinGroup(groupId, inviteCode);

		if (joinRes.new) {
			toast("Joined Group", { description: "Time to make cents of things." });
			sendNotification(groupId, joinRes.groupName, `${joinRes.userName} just joined the group!`, `/group/${groupId}`);
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

<!-- 100dvh - 2rem; accounting for `p-4` on all pages from `App.vue` -->
<template>
	<div class="flex min-h-[calc(100dvh-2rem)] items-center justify-center">
		<Card class="-translate-y-8 min-w-none sm:min-w-sm">
			<CardContent class="flex flex-col items-center gap-4 p-8">
				<Loader class="animate-spin size-14" />
				<span class="text-lg text-muted-foreground font-semibold">Validating Invite Link</span>
			</CardContent>
		</Card>
	</div>
</template>
