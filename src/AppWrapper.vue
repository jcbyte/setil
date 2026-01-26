<script setup lang="ts">
import App from "./App.vue";
import MaintenancePage from "./pages/MaintenancePage.vue";

const dev = import.meta.env.DEV;
const maintenance = String(import.meta.env.VITE_MAINTENANCE ?? "false").toUpperCase() === "TRUE";
const showMaintenance = maintenance && !dev;
</script>

<template>
	<App v-if="!showMaintenance" />
	<MaintenancePage v-else />
</template>
