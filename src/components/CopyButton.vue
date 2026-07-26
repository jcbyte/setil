<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { Check, Copy } from "@lucide/vue";
import { ref } from "vue";

const props = defineProps<{
	text: string;
}>();

const copied = ref<boolean>(false);
const copyRemoverTimeout = ref<number>();

async function copy() {
	clearTimeout(copyRemoverTimeout.value);

	await navigator.clipboard.writeText(props.text);
	copied.value = true;

	copyRemoverTimeout.value = setTimeout(() => {
		copied.value = false;
	}, 4000);
}
</script>

<template>
	<Button type="button" variant="ghost" size="icon" v-bind="$attrs" @click="copy()">
		<Check v-if="copied" />
		<Copy v-else />
	</Button>
</template>
