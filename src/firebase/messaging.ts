import { getMessaging, getToken } from "firebase/messaging";
import { app } from "./firebase";
import { addFwcToken } from "./firestore/user";
import { getUser } from "./firestore/util";

const VAPID_KEY = "BNTO7GezdnZI2F6tcCs-IENFqIrp0BJ27_lmVEaz19VtOgDaA6uhnzYl0AdAWAzwh6yqN0mDOA30qeOoyay6p-8";

const messaging = getMessaging(app);

/**
 * Request notification permission.
 */
export async function requestPushNotificationPermission(): Promise<void> {
	try {
		const token = await getToken(messaging, { vapidKey: VAPID_KEY });

		if (token) {
			// Save the token for the user
			await addFwcToken(token);
		} else {
			throw Error("Notifications not available on this device.");
		}
	} catch (error) {
		// Most likely the user has not given notification permissions which is fine
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
