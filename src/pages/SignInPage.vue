<script setup lang="ts">
import GoogleGLogo from "@/assets/GoogleGLogo.svg";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { signIn } from "@/util/app";

const version = __APP_VERSION__;
</script>

<template>
	<!-- 100dvh - 2rem; accounting for `p-4` on all pages from `App.vue` -->
	<div class="flex min-h-[calc(100dvh-2rem)] w-full items-center justify-center">
		<Card class="-translate-y-8 min-w-none sm:min-w-sm">
			<CardContent class="flex flex-col items-center gap-4 p-8">
				<div class="flex flex-col">
					<span class="text-2xl font-bold text-center">Welcome to Setil</span>
					<span class="text-sm text-muted-foreground text-center">
						Sign in to start splitting expenses with friends
					</span>
				</div>

				<Separator />

				<Button @click="signIn()" class="px-8">
					<img :src="GoogleGLogo" class="size-5" />
					<span class="font-semibold">Continue with Google</span>
				</Button>

				<span class="text-sm text-muted-foreground text-center">Setil v{{ version }} by Joel Cutler</span>
			</CardContent>
		</Card>
	</div>
</template>
