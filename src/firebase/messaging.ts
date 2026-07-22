import { getUser } from "./firestore/util";

// /**
//  * Request notification permission.
//  */
// export async function requestPushNotificationPermission(): Promise<void> {
// 	try {
// 		const token = await getToken(messaging, { vapidKey: VAPID_KEY });

// 		if (token) {
// 			// Save the token for the user
// 			await addFid(token);
// 		} else {
// 			throw Error("Notifications not available on this device.");
// 		}
// 	} catch (error) {
// 		// Most likely the user has not given notification permissions which is fine
// 	}
// }

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
