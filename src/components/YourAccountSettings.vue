<script setup lang="ts">
import Avatar from "@/components/Avatar.vue";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLiveCurrentUserData } from "@/composables/useLiveCurrentUserData";
import authService from "@/util/authService";
import { LogOut, Settings } from "@lucide/vue";
import { Skeleton } from "./ui/skeleton";

const { user: currentUser, signOut } = authService;
const currentUserData = useLiveCurrentUserData();
</script>

<template>
	<DropdownMenu>
		<DropdownMenuTrigger as-child>
			<div class="size-9">
				<Avatar
					v-if="currentUser && currentUserData.public"
					class="size-full"
					:src="currentUserData.public.photoUrl ?? null"
					:name="currentUserData.public.name"
					:uid="currentUser.uid"
				/>
				<Skeleton v-else class="size-full rounded-full" />
			</div>
		</DropdownMenuTrigger>
		<DropdownMenuContent>
			<RouterLink to="/settings">
				<DropdownMenuItem>
					<div class="w-full flex justify-between items-center">
						<span>Settings</span>
						<Settings class="size-5" />
					</div>
				</DropdownMenuItem>
			</RouterLink>
			<DropdownMenuItem @click="signOut">
				<div class="w-full flex justify-between items-center">
					<span class="text-red-400">Sign Out</span>
					<LogOut class="text-red-400 size-5" />
				</div>
			</DropdownMenuItem>
		</DropdownMenuContent>
	</DropdownMenu>
</template>
