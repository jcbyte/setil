import { firebaseSignOut, signInWithGoogle } from "@/firebase/auth";
import { cleanupInvites, invite } from "@/firebase/firestore/group";
import { type Router } from "vue-router";
import { toast } from "vue-sonner";

export async function signIn() {
	const persistentToast = toast.loading("Signing In", {
		description: "Please continue in the popup window.",
	});

	try {
		const newUser = await signInWithGoogle();

		toast("Signed In", { description: newUser ? "Welcome to Setil!" : "Welcome back!", id: persistentToast });
	} catch (error: any) {
		toast.error("Error Signing In", { description: error.code, id: persistentToast });
	}
}

export function signOut() {
	firebaseSignOut()
		.then(() => {
			toast("Signed Out", { description: "See you again soon!" });
		})
		.catch((error) => {
			toast.error("Error Signing Out", { description: error.code });
		});
}

export async function inviteUser(groupId: string, groupName: string) {
	// Cleanup old invites
	await cleanupInvites(groupId);

	// Create invite
	const inviteCode = await invite(groupId, 3 * 24 * 60 * 60 * 1000);
	const inviteLink = `${window.location.origin}/invite/${groupId}/${inviteCode}`;
	const sharedData = {
		title: "Setil Invite Link",
		text: `Join my Setil Group, ${groupName}! This link will be valid for 3 days.`,
		url: inviteLink,
	};

	// If this can be shared then share it
	if (navigator.canShare(sharedData)) {
		await navigator.share(sharedData);
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
