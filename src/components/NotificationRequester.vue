<script setup lang="ts">
import { requestPushNotificationPermission } from "@/firebase/messaging";
import { onMounted } from "vue";
import { toast } from "vue-sonner";

onMounted(async () => {
	// If the user has previously denied notifications do not try and request them again
	if (Notification.permission === "denied") return;

	try {
		await requestPushNotificationPermission();
	} catch (error: any) {
		toast.error("Notifications Not Enabled", {
			description: error.message,
		});
	}
});
</script>

<template></template>
