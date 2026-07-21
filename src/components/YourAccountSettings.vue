<script setup lang="ts">
import Avatar from "@/components/Avatar.vue";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrentUser } from "@/composables/useCurrentUser.ts";
import { useLiveCurrentUserData } from "@/composables/useLiveCurrentUserData";
import { signOut } from "@/util/app";
import { LogOut, Settings } from "@lucide/vue";
import { useRouter } from "vue-router";

const router = useRouter();

const currentUser = useCurrentUser();
const currentUserData = useLiveCurrentUserData();
</script>

<template>
	<DropdownMenu>
		<DropdownMenuTrigger as-child>
			<Avatar
				v-bind="$attrs"
				class="size-9"
				:src="currentUserData?.public.photoUrl ?? null"
				:name="currentUserData?.public.name ?? currentUser!.displayName ?? 'Me'"
			/>
		</DropdownMenuTrigger>
		<DropdownMenuContent>
			<DropdownMenuItem @click="router.push('/settings')">
				<div class="w-full flex justify-between items-center">
					<span>Settings</span>
					<Settings class="!size-5" />
				</div>
			</DropdownMenuItem>
			<DropdownMenuItem @click="signOut">
				<div class="w-full flex justify-between items-center">
					<span class="text-red-400">Sign Out</span>
					<LogOut class="text-red-400 !size-5" />
				</div>
			</DropdownMenuItem>
		</DropdownMenuContent>
	</DropdownMenu>
</template>
