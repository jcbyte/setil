<script setup lang="ts">
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ChevronRight } from "@lucide/vue";
import { RouterLink, type RouteLocationRaw } from "vue-router";

const props = defineProps<{
	to: RouteLocationRaw;
	hideChevron?: boolean;
	class?: string;
}>();
</script>

<template>
	<RouterLink :to="to" class="block no-underline text-inherit focus:outline-none">
		<Card
			role="link"
			:class="
				cn(
					'group relative flex flex-col cursor-pointer overflow-hidden transition-all duration-200',
					'hover:-translate-y-1',
					'hover:border-primary/30 hover:[box-shadow:0_18px_48px_color-mix(in_oklch,var(--primary)_13%,transparent)]',
					'dark:hover:border-primary/25 dark:hover:[box-shadow:0_20px_52px_rgb(0_0_0/30%),0_0_28px_color-mix(in_oklch,var(--primary)_8%,transparent)]',
					'focus-visible:ring-3 focus-visible:ring-primary/25',
					// ! Target `CardHeader`; it is required
					!hideChevron && '[&>*:first-child]:pr-12',
					props.class,
				)
			"
		>
			<slot />

			<ChevronRight
				v-if="!hideChevron"
				class="absolute right-5 top-5 size-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary"
			/>
		</Card>
	</RouterLink>
</template>
