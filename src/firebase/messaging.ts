import { fetchApiJson } from "@/api/api";
import router from "@/router";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { Bell } from "@lucide/vue";
import type { SendGroupNotificationPostBody } from "@shared/types/api";
import { DEFAULT_NOTIFICATION_CHANNEL, type NotificationDetail } from "@shared/types/notification";
import { getMessaging, isSupported, onMessage, onRegistered, register } from "firebase/messaging";
import { h } from "vue";
import { toast } from "vue-sonner";
import { addAndroidPushToken, addFid } from "./firestore/user";
import { getUser } from "./firestore/util";

let notificationInit: Promise<void> | undefined;

function displayNotificationInApp(title: string, description?: string, route?: unknown) {
	toast(title, {
		description,
		icon: h(Bell, { class: "size-4" }),
		position: "top-center",
		...(route && typeof route === "string"
			? {
					action: {
						label: "View",
						onClick: () => router.push(route),
					},
				}
			: {}),
	});
}

async function initialiseNativeNotifications() {
	if (Capacitor.getPlatform() === "android") {
		await PushNotifications.createChannel({
			id: DEFAULT_NOTIFICATION_CHANNEL,
			name: "General notifications",
			description: "Group activity and payments",
			importance: 4,
			vibration: true,
		});
	}

	await PushNotifications.addListener("registration", ({ value }) => addAndroidPushToken(value));
	await PushNotifications.addListener("registrationError", (e) =>
		toast.error("Error Enabling Notifications", { description: String(e) }),
	);
	await PushNotifications.addListener("pushNotificationReceived", (notification) =>
		displayNotificationInApp(notification.title ?? "Setil", notification.body, notification.data?.route),
	);
	await PushNotifications.addListener("pushNotificationActionPerformed", ({ notification }) => {
		const route = notification.data?.route;
		if (route && typeof route === "string") router.push(route);
	});
}

async function initialiseWebNotifications() {
	const messagingSupported = await isSupported();
	if (!messagingSupported) return;

	const messaging = getMessaging();
	onMessage(messaging, (payload) =>
		displayNotificationInApp(payload.data?.title ?? "Setil", payload.data?.body, payload.data?.route),
	);
}

/** Set up notification listeners once, early in application startup. */
export function initialiseNotifications() {
	if (notificationInit) return;
	notificationInit = (Capacitor.isNativePlatform() ? initialiseNativeNotifications : initialiseWebNotifications)();
}

async function requestNativeNotifications() {
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
			await requestNativeNotifications();
		}
	} catch (e) {
		toast.error("Notifications Could not be Enabled", {
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
