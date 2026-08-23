<script setup lang="ts">
import { useColorMode } from "@vueuse/core";
import "vue-sonner/style.css";
import App from "./App.vue";
import MaintenancePage from "./pages/MaintenancePage.vue";
import { getBooleanEnv } from "./util/util.js";

const dev = import.meta.env.DEV;
const showMaintenance = getBooleanEnv(import.meta.env.VITE_MAINTENANCE) && !dev;

useColorMode({
	storageKey: "setil-theme",
	initialValue: "dark",
});
</script>

<template>
	<div class="min-h-dvh safe-area flex">
		<div class="flex-1">
			<App v-if="!showMaintenance" />
			<MaintenancePage v-else />
		</div>
	</div>
</template>

<style>
.safe-area {
	padding-top: var(--safe-area-inset-top, env(safe-area-inset-top, 0px));
	padding-right: var(--safe-area-inset-right, env(safe-area-inset-right, 0px));
	padding-bottom: var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px));
	padding-left: var(--safe-area-inset-left, env(safe-area-inset-left, 0px));
}
</style>
