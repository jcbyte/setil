import { cleanupInvites, invite } from "@/firebase/firestore/group";
import { Capacitor } from "@capacitor/core";
import { Share, type ShareOptions } from "@capacitor/share";
import { type Router } from "vue-router";
import { toast } from "vue-sonner";

const INVITE_VALIDITY_DAYS = 3;

export async function inviteUser(groupId: string, groupName: string) {
	// Cleanup old invites
	await cleanupInvites(groupId);

	const origin = Capacitor.isNativePlatform()
		? import.meta.env.VITE_PUBLIC_ORIGIN_URL?.replace(/\/+$/, "")
		: window.location.origin;
	if (!origin) throw new Error("Missing public origin URL for invite link generation.");

	// Create invite
	const inviteCode = await invite(groupId, INVITE_VALIDITY_DAYS * 24 * 60 * 60 * 1000);
	const inviteLink = `${origin}/invite/${groupId}/${inviteCode}`;
	const sharedData: ShareOptions = {
		title: "Setil Invite Link",
		text: `Join my Setil Group, ${groupName}! This link will be valid for ${INVITE_VALIDITY_DAYS} days.`,
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
