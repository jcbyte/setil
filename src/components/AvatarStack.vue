<script setup lang="ts">
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import CustomAvatar, { type AvatarProp } from "./Avatar.vue";

defineProps<{
	avatars: AvatarProp[];
	totalCount?: number | null;
	avatarClass?: any;
}>();
</script>

<template>
	<div class="flex -space-x-4">
		<CustomAvatar
			:class="avatarClass"
			v-for="(avatar, avatarIdx) in avatars"
			:key="avatarIdx"
			:src="avatar.src"
			:name="avatar.name"
			:uid="avatar.uid"
		/>
		<Avatar :class="avatarClass" v-if="totalCount && totalCount > avatars.length">
			<AvatarFallback>+{{ totalCount - avatars.length }}</AvatarFallback>
		</Avatar>
	</div>
</template>
