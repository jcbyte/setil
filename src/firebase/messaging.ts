import { getMessaging, isSupported, onRegistered, register } from "firebase/messaging";
import { toast } from "vue-sonner";
import { addFid } from "./firestore/user";
import { getUser } from "./firestore/util";

export async function requestNotifications() {
	const messagingSupported = await isSupported();
	if (!messagingSupported) return;

	// If the user has previously denied notifications do not try and request them again
	if (Notification.permission === "denied") return;

	try {
		const permission = await Notification.requestPermission();
		if (permission !== "granted") return;

		const messaging = getMessaging();

		// On registered, store the fid
		onRegistered(messaging, async (fid) => {
			await addFid(fid);
		});

		const serviceWorkerRegistration = await navigator.serviceWorker.ready;
		await register(messaging, {
			serviceWorkerRegistration,
			vapidKey: import.meta.env.VITE_VAPID_KEY,
		});
	} catch (error: any) {
		toast.error("Notifications Could not be enabled", {
			description: error.message,
		});
	}
}

/**
 * Send a notification to all suers within a specified group.
 * @param groupId id of the group to send users messages to.
 * @param title title of the notification.
 * @param body body of the notification.
 * @returns true if it was successful.
 */
export async function sendNotification(groupId: string, title: string, body: string, route?: string): Promise<boolean> {
	const user = getUser();

	const res = await fetch("/api/send-group-notification", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${await user.getIdToken()}`,
		},
		body: JSON.stringify({ groupId: groupId, title, body, ...(route && { route }) }),
	}).then((res) => res.json());

	return res.success;
}
