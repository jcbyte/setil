<script setup lang="ts">
import { useToast } from "@/components/ui/toast";
import { joinGroup } from "@/firebase/firestore/group";
import { sendNotification } from "@/firebase/messaging";
import { getRouteParam } from "@/util/util";
import { Loader } from "lucide-vue-next";
import { onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();
const { toast } = useToast();

const routeGroupId = getRouteParam(route.params.groupId);
const routeInviteCode = getRouteParam(route.params.inviteCode);

onMounted(async () => {
	if (!routeGroupId || !routeInviteCode) {
		toast({
			title: "Invalid Link",
			description: "Ensure this is a valid link.",
			variant: "destructive",
			duration: 5000,
		});
		router.push(`/`);
		return;
	}

	try {
		const { new: joined, user: userData, group: groupData } = await joinGroup(routeGroupId, routeInviteCode, true);

		if (joined) {
			toast({ title: "Joined Group", description: "Time to make cents of things.", duration: 5000 });
			sendNotification(
				routeGroupId,
				groupData.name,
				`${userData.nickname} just joined the group!`,
				`/group/${routeGroupId}`,
			);
		}
		router.push(`/group/${routeGroupId}`);
	} catch {
		toast({
			title: "Could Not Join Group",
			description: "Ensure this link has not expired.",
			variant: "destructive",
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
