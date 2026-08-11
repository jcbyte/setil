<script setup lang="ts">
import ThemedContinueButton from "@/components/google/ThemedContinueButton.vue";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { publicLinks } from "@/constants/public";
import authService from "@/util/authService";
import { Capacitor } from "@capacitor/core";
import { Dot } from "@lucide/vue";
import { useOneTap } from "vue3-google-signin";

const version = __APP_VERSION__;
const { signInWithGooglePopup, signInWithGoogleCredential, isCurrentlyInteracting } = authService;

if (!Capacitor.isNativePlatform()) {
	// Do not run Google One Tap if in a native app
	useOneTap({
		onSuccess: (response) => {
			if (response.credential) signInWithGoogleCredential(response.credential);
		},
	});
}
</script>

<template>
	<div class="flex flex-col h-full w-full items-center justify-center gap-1">
		<Card class="-translate-y-8 w-full max-w-md">
			<CardContent class="flex flex-col items-center gap-6 p-8 sm:p-10 text-center">
				<img src="/icon/icon-192.png" alt="Setil" class="size-16 rounded-2xl shadow-2xl shadow-primary/25" />
				<div class="flex flex-col items-center gap-2">
					<h1 class="font-heading text-3xl font-extrabold tracking-tight">Welcome to Setil</h1>
					<span class="text-sm text-muted-foreground"> Sign in to start splitting expenses with friends </span>
				</div>

				<Separator />

				<ThemedContinueButton @click="signInWithGooglePopup" :disabled="isCurrentlyInteracting" />

				<span class="text-sm text-muted-foreground">Setil v{{ version }} by Joel Cutler</span>
			</CardContent>
		</Card>

		<div class="fixed bottom-2 right-0 left-0 flex items-center justify-center gap-0">
			<RouterLink :to="publicLinks.about" class="justify-self-end">
				<Button variant="link" class="text-xs leading-relaxed px-2 text-muted-foreground">About</Button>
			</RouterLink>
			<Dot class="size-4 text-muted-foreground" />
			<RouterLink :to="publicLinks.privacy" class="justify-self-end">
				<Button variant="link" class="text-xs leading-relaxed px-2 text-muted-foreground">Privacy Policy</Button>
			</RouterLink>
			<Dot class="size-4 text-muted-foreground" />
			<RouterLink :to="publicLinks.support" class="justify-self-start">
				<Button variant="link" class="text-xs leading-relaxed px-2 text-muted-foreground">Support</Button>
			</RouterLink>
		</div>
	</div>
</template>
