<script setup lang="ts">
import { useColorMode } from "@vueuse/core";
import "vue-sonner/style.css";
import App from "./App.vue";
import MaintenancePage from "./pages/MaintenancePage.vue";

const dev = import.meta.env.DEV;
const maintenance = String(import.meta.env.VITE_MAINTENANCE ?? "false").toUpperCase() === "TRUE";
const showMaintenance = maintenance && !dev;

useColorMode({
	storageKey: "setil-theme",
	initialValue: "dark",
});
</script>

<template>
	<div class="min-h-dvh p-safe flex">
		<div class="flex-1">
			<App v-if="!showMaintenance" />
			<MaintenancePage v-else />
		</div>
	</div>
</template>

<style>
.p-safe {
	padding: env(safe-area-inset-top, 0px) env(safe-area-inset-right, 0px) env(safe-area-inset-bottom, 0px)
		env(safe-area-inset-left, 0px);
}
</style>
