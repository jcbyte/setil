<script setup lang="ts">
import { useColorMode } from "@vueuse/core";
import App from "./App.vue";
import MaintenancePage from "./pages/MaintenancePage.vue";

const dev = import.meta.env.DEV;
const maintenance = String(import.meta.env.VITE_MAINTENANCE ?? "false").toUpperCase() === "TRUE";
const showMaintenance = maintenance && !dev;

useColorMode().value = "dark";
</script>

<template>
	<App v-if="!showMaintenance" />
	<MaintenancePage v-else />
</template>
