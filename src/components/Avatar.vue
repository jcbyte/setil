<script setup lang="ts">
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import fnv1a from "@sindresorhus/fnv1a";
import { computed } from "vue";

export interface AvatarProp {
	src: string | null;
	name: string;
	uid: string;
}

const props = defineProps<AvatarProp>();

const fallbackColours = [
	"bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
	"bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
	"bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
	"bg-lime-100 text-lime-800 dark:bg-lime-950 dark:text-lime-300",
	"bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
	"bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300",
	"bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
	"bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300",
	"bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
	"bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300",
];

const fallbackColour = computed(() => {
	const hash = Number(fnv1a(props.uid));
	return fallbackColours[hash % fallbackColours.length];
});
</script>

<template>
	<Avatar v-bind="$attrs" :class="cn('border border-border', fallbackColour)">
		<AvatarImage :src="src ?? ''" :alt="name" />
		<AvatarFallback>{{ name.substring(0, 2) }}</AvatarFallback>
	</Avatar>
</template>
