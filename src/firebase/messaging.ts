import { fetchApiJson } from "@/api/api";
import router from "@/router";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import type { SendGroupNotificationPostBody } from "@shared/types/api";
import { DEFAULT_NOTIFICATION_CHANNEL, type NotificationDetail } from "@shared/types/notification";
import { getMessaging, isSupported, onRegistered, register } from "firebase/messaging";
import { toast } from "vue-sonner";
import { addAndroidPushToken, addFid } from "./firestore/user";
import { getUser } from "./firestore/util";

let nativeNotificationInit: Promise<void> | undefined;

/** Set up native notification listeners once, early in application startup. */
export function initialiseNotifications() {
	if (!Capacitor.isNativePlatform()) return;
	if (nativeNotificationInit) return;

	nativeNotificationInit = (async () => {
		if (Capacitor.getPlatform() === "android") {
			await PushNotifications.createChannel({
				id: DEFAULT_NOTIFICATION_CHANNEL,
				name: "General notifications",
				description: "Group activity and payment notifications",
				importance: 4,
				vibration: true,
			});
		}

		await PushNotifications.addListener("registration", ({ value }) => addAndroidPushToken(value));
		await PushNotifications.addListener("registrationError", ({ error }) =>
			toast.error("Notifications could not be enabled", { description: error }),
		);
		await PushNotifications.addListener("pushNotificationReceived", (notification) =>
			toast(notification.title ?? "Setil", { description: notification.body, position: "top-center" }),
		);
		await PushNotifications.addListener("pushNotificationActionPerformed", ({ notification }) => {
			const route = notification.data?.route;
			if (route && typeof route === "string") void router.push(route);
		});
	})();
}

async function requestNativeNotifications() {
	await initialiseNotifications();

	let permission = await PushNotifications.checkPermissions();
	if (permission.receive === "prompt" || permission.receive === "prompt-with-rationale") {
		permission = await PushNotifications.requestPermissions();
	}
	if (permission.receive !== "granted") return;

	await PushNotifications.register();
}

async function requestWebNotifications() {
	const messagingSupported = await isSupported();
	if (!messagingSupported) return;

	// If the user has previously denied notifications do not try and request them again
	if (Notification.permission === "denied") return;

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
}

export async function requestNotifications() {
	try {
		if (!Capacitor.isNativePlatform()) {
			await requestWebNotifications();
		} else {
			try {
				await requestNativeNotifications();
			} catch (error) {
				toast.error("Notifications could not be enabled", {
					description: error instanceof Error ? error.message : String(error),
				});
			}
		}
	} catch (e) {
		toast.error("Notifications Could not be enabled", {
			description: String(e),
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
