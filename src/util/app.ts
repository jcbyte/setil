import { useToast } from "@/components/ui/toast";
import { useCurrentUser } from "@/composables/useCurrentUser";
import { firebaseSignOut, signInWithGoogle } from "@/firebase/auth";
import { cleanupInvites, invite } from "@/firebase/firestore/group";
import { useRouter } from "vue-router";

export async function signIn() {
	const { toast } = useToast();
	const { currentUserInitialised } = useCurrentUser();

	const persistentToast = toast({
		title: "Signing In",
		description: "Please continue in the popup window.",
		duration: 0,
	});

	try {
		const newUser = await signInWithGoogle();
		currentUserInitialised.value = true;

		persistentToast.dismiss();
		toast({ title: "Signed In", description: newUser ? "Welcome to Setil!" : "Welcome back!", duration: 5000 });
	} catch (error: any) {
		persistentToast.dismiss();
		toast({ title: "Error Signing In", description: error.code, variant: "destructive", duration: 5000 });
	}
}

export function signOut() {
	const { toast } = useToast();

	firebaseSignOut()
		.then(() => {
			toast({ title: "Signed Out", description: "See you again soon!", duration: 5000 });
		})
		.catch((error) => {
			toast({ title: "Error Signing Out", description: error.code, variant: "destructive", duration: 5000 });
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
		const { toast } = useToast();

		// Else copy to clipboard and display a confirmation
		await navigator.clipboard.writeText(inviteLink).then(() => {
			toast({
				title: "Copied Link to Clipboard",
				description: "This link will be valid for 3 days.",
				duration: 5000,
			});
		});
	}
}

export function noGroup() {
	const { toast } = useToast();
	const router = useRouter();

	toast({
		title: "Group Not Found",
		description: "Ensure you are a member of this group.",
		variant: "destructive",
		duration: 5000,
	});

	router.replace("/");
}
