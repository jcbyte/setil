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

const { user: currentUser, signOut } = authService;
const currentUserData = useLiveCurrentUserData();
</script>

<template>
	<DropdownMenu>
		<DropdownMenuTrigger as-child>
			<Avatar
				v-bind="$attrs"
				class="size-9"
				:src="currentUserData.public?.photoUrl ?? null"
				:name="currentUserData.public?.name ?? currentUser!.displayName ?? 'Me'"
			/>
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
import { useAuth } from "@/auth/useAuth";
