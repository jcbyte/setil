<script setup lang="ts">
import { joinGroup } from "@/firebase/firestore/group";
import { sendNotification } from "@/firebase/messaging";
import { getRouteParam } from "@/util/util";
import { Loader } from "@lucide/vue";
import { onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { toast } from "vue-sonner";

const route = useRoute();
const router = useRouter();

const routeGroupId = getRouteParam(route.params.groupId);
const routeInviteCode = getRouteParam(route.params.inviteCode);

onMounted(async () => {
	if (!routeGroupId || !routeInviteCode) {
		toast.error("Invalid Link", {
			description: "Ensure this is a valid link.",
		});
		router.push(`/`);
		return;
	}

	try {
		const joinRes = await joinGroup(routeGroupId, routeInviteCode, true);

		if (joinRes.new) {
			toast("Joined Group", { description: "Time to make cents of things." });
			sendNotification(
				routeGroupId,
				joinRes.group.name,
				`${joinRes.user.nickname} just joined the group!`,
				`/group/${routeGroupId}`,
			);
		}
		router.push(`/group/${routeGroupId}`);
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
	<div class="flex items-center justify-center">
		<div class="flex flex-col items-center justify-center gap-4 border border-border p-8 min-w-80 rounded-lg">
			<Loader class="animate-spin !size-12" />
			<span class="text-muted-foreground font-semibold">Validating Invite Link</span>
		</div>
	</div>
</template>
