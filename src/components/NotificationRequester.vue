<script setup lang="ts">
import { addFid } from "@/firebase/firestore/user";
import { getMessaging, onRegistered, register } from "firebase/messaging";
import { onMounted } from "vue";
import { toast } from "vue-sonner";

const messaging = getMessaging();

const VAPID_KEY = "BNTO7GezdnZI2F6tcCs-IENFqIrp0BJ27_lmVEaz19VtOgDaA6uhnzYl0AdAWAzwh6yqN0mDOA30qeOoyay6p-8";

onRegistered(messaging, async (fid) => {
	await addFid(fid);
});

onMounted(async () => {
	// If the user has previously denied notifications do not try and request them again
	if (Notification.permission === "denied") return;

	try {
		const permission = await Notification.requestPermission();
		if (permission !== "granted") return;

		await register(messaging, {
			vapidKey: VAPID_KEY,
		});
	} catch (error: any) {
		toast.error("Notifications Not Enabled", {
			description: error.message,
		});
	}
});
</script>

<template></template>
