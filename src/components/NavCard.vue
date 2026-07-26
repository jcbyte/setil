<script setup lang="ts">
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ChevronRight } from "@lucide/vue";
import { RouterLink, type RouteLocationRaw } from "vue-router";

const props = defineProps<{
	to: RouteLocationRaw;
	class?: string;
}>();
</script>

<template>
	<RouterLink :to="to" class="block no-underline text-inherit focus:outline-none">
		<Card
			role="link"
			:class="
				cn(
					'group relative flex flex-col cursor-pointer transition hover:border-primary/40 hover:shadow-md',
					// ! Target `CardHeader`; it is required
					'[&>*:first-child]:pr-12',
					props.class,
				)
			"
		>
			<slot />

			<ChevronRight
				class="absolute right-5 top-5 size-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-foreground"
			/>
		</Card>
	</RouterLink>
</template>
