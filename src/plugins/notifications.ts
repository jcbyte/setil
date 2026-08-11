import { addAndroidPushToken } from "@/firebase/firestore/user";
import router from "@/router";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { Bell } from "@lucide/vue";
import { DEFAULT_NOTIFICATION_CHANNEL } from "@shared/types/notification";
import { getMessaging, isSupported, onMessage } from "firebase/messaging";
import { h, type Plugin } from "vue";
import { toast } from "vue-sonner";

let initPromise: Promise<void> | undefined;

const NotificationPlugin: Plugin = {
	install() {
		initialiseNotifications();
	},
};
export default NotificationPlugin;

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

function initialiseNotifications(): Promise<void> {
	if (initPromise) return initPromise;

	const resolvedNotificationInitialiser = Capacitor.isNativePlatform()
		? initialiseNativeNotifications
		: initialiseWebNotifications;
	initPromise = resolvedNotificationInitialiser().catch((e) => {
		initPromise = undefined;
		throw e;
	});

	return initPromise;
}
