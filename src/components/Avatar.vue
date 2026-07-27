<script setup lang="ts">
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface AvatarProp {
	src: string | null;
	name: string;
}

defineProps<AvatarProp>();
</script>

<template>
	<Avatar v-bind="$attrs" class="border border-border">
		<AvatarImage :src="src ?? ''" :alt="name" />
		<AvatarFallback>{{ name.substring(0, 2) }}</AvatarFallback>
	</Avatar>
</template>
