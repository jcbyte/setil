<script setup lang="ts">
import GoogleGLogo from "@/assets/GoogleGLogo.svg";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { signIn } from "@/util/app";

const version = __APP_VERSION__;
</script>

<template>
	<div class="flex flex-col items-center justify-center gap-2 min-h-dvh p-4">
		<div class="flex w-full max-w-sm flex-col items-center gap-4 rounded-lg border border-border p-8 -mt-16">
			<div class="flex flex-col">
				<span class="text-2xl font-bold text-center">Welcome to Setil</span>
				<span class="text-sm text-muted-foreground text-center">
					Sign in to start splitting expenses with friends
				</span>
			</div>

			<Separator />

			<Button @click="signIn()" class="min-w-58">
				<img :src="GoogleGLogo" class="size-5" />
				<span class="font-semibold">Continue with Google</span>
			</Button>
		</div>

		<span class="text-sm text-muted-foreground text-center">Setil v{{ version }} by Joel Cutler</span>
	</div>
</template>
