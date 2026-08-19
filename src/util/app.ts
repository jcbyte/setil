import { cleanupInvites, invite } from "@/firebase/firestore/group";
import { Share, type ShareOptions } from "@capacitor/share";
import { type Router } from "vue-router";
import { toast } from "vue-sonner";

export async function inviteUser(groupId: string, groupName: string) {
	// Cleanup old invites
	await cleanupInvites(groupId);

	// Create invite
	const inviteCode = await invite(groupId, 3 * 24 * 60 * 60 * 1000);
	const inviteLink = `${window.location.origin}/invite/${groupId}/${inviteCode}`;
	const sharedData: ShareOptions = {
		title: "Setil Invite Link",
		text: `Join my Setil Group, ${groupName}! This link will be valid for 3 days.`,
		url: inviteLink,
		dialogTitle: "Share Invite Link",
	};

	// If this can be shared then share it
	if (await Share.canShare()) {
		await Share.share(sharedData);
	} else {
		// Else copy to clipboard and display a confirmation
		await navigator.clipboard.writeText(inviteLink).then(() => {
			toast("Copied Link to Clipboard", {
				description: "This link will be valid for 3 days.",
			});
		});
	}
}

export function noGroup(router: Router) {
	toast.error("Group Not Found", {
		description: "Ensure you are a member of this group.",
	});

	router.replace("/");
}
