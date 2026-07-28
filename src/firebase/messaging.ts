import { fetchApiJson } from "@/api/api";
import type { SendGroupNotificationPostBody } from "@shared/types/api";
import type { NotificationDetail } from "@shared/types/notification";
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
 * @param notification details of the notification to send.
 */
export async function sendNotification(groupId: string, notification: NotificationDetail) {
	const user = getUser();

	const body: SendGroupNotificationPostBody = { groupId, notification };
	await fetchApiJson("/api/send-group-notification", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${await user.getIdToken()}`,
		},
		body: JSON.stringify(body),
	});
}
