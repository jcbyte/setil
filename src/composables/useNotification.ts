import { addFid } from "@/firebase/firestore/user";
import { getMessaging, onRegistered, register } from "firebase/messaging";
import { toast } from "vue-sonner";

const VAPID_KEY = "BNTO7GezdnZI2F6tcCs-IENFqIrp0BJ27_lmVEaz19VtOgDaA6uhnzYl0AdAWAzwh6yqN0mDOA30qeOoyay6p-8";

export function useNotification() {
	const messaging = getMessaging();

	// On registered, store the fid
	onRegistered(messaging, async (fid) => {
		await addFid(fid);
	});

	async function requestNotifications() {
		// If the user has previously denied notifications do not try and request them again
		if (Notification.permission === "denied") return;

		try {
			const permission = await Notification.requestPermission();
			if (permission !== "granted") return;

			await register(messaging, {
				vapidKey: VAPID_KEY,
			});
		} catch (error: any) {
			toast.error("Notifications Could not be enabled", {
				description: error.message,
			});
		}
	}

	return { requestNotifications };
}
