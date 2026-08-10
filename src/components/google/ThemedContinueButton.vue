<!-- This component uses Google approved 'Continue with Google' buttons -->
<!-- https://developers.google.com/identity/branding-guidelines -->

<script setup lang="ts">
import { useColorMode } from "@vueuse/core";
import ContinueDark from "./ContinueDark.vue";
import ContinueLight from "./ContinueLight.vue";

const resolvedTheme = useColorMode().state;
</script>

<template>
	<component :is="resolvedTheme === 'dark' ? ContinueDark : ContinueLight" v-bind="$attrs" />
</template>
