<script setup lang="ts">
import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "vue";

const props = defineProps<{
	class?: HTMLAttributes["class"];
}>();
</script>

<template>
	<div
		:class="
			cn(
				'surface-glass rounded-2xl border bg-card text-card-foreground',
				'border-border/75 shadow-[0_1px_2px_rgb(24_24_35/5%),0_14px_36px_color-mix(in_oklch,var(--primary)_8%,transparent)]',
				'dark:border-white/8 dark:shadow-[0_1px_1px_rgb(0_0_0/18%),0_18px_48px_rgb(0_0_0/22%),0_0_0_1px_color-mix(in_oklch,var(--primary)_3%,transparent)]',
				props.class,
			)
		"
	>
		<slot />
	</div>
</template>
