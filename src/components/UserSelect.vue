<script setup lang="ts">
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { GroupUserDataWithPublic } from "@/composables/useLiveGroupWithUserPublic";
import Avatar from "./Avatar.vue";

const props = defineProps<{
	users: Record<string, GroupUserDataWithPublic>;
	selectedUser?: string;
	id?: string;
}>();
</script>

<template>
	<Select v-bind="$attrs">
		<SelectTrigger :id="id">
			<SelectValue placeholder="Select a member">
				<div v-if="selectedUser" class="flex items-center gap-2">
					<Avatar
						v-if="users[selectedUser]?.computed.name"
						:src="users[selectedUser]?.public?.photoUrl ?? null"
						:name="users[selectedUser].computed.name!"
						class="size-6"
					/>
					<Skeleton v-else class="size-6 rounded-full" />
					<span v-if="props.users[selectedUser]?.computed.name">
						{{ props.users[selectedUser].computed.name }}
					</span>
					<Skeleton v-else class="w-18 h-5" />
				</div>
			</SelectValue>
		</SelectTrigger>
		<SelectContent>
			<SelectItem v-for="(user, userId) in users" :value="userId">
				<div class="flex items-center gap-2">
					<Avatar
						v-if="user.computed.name"
						:src="user.public?.photoUrl ?? null"
						:name="user.computed.name"
						:class="`size-5 ${user.status !== 'active' && 'opacity-70'}`"
					/>
					<Skeleton v-else class="size-5 rounded-full" />
					<span v-if="user.computed.name" :class="`${user.status !== 'active' && 'text-muted-foreground'}`">
						{{ user.computed.name }}
					</span>
					<Skeleton v-else class="w-18 h-5" />
				</div>
			</SelectItem>
		</SelectContent>
	</Select>
</template>
