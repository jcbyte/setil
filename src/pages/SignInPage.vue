<script setup lang="ts">
import ThemedContinueButton from "@/components/google/ThemedContinueButton.vue";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { app } from "@/firebase/firebase";
import { initialiseUserData } from "@/firebase/firestore/user";
import { signIn } from "@/util/app";
import { getAuth, GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { toast } from "vue-sonner";
import { useOneTap } from "vue3-google-signin";

const version = __APP_VERSION__;

useOneTap({
	onSuccess: async (res) => {
		const persistentToast = toast.loading("Signing In", {
			description: "Retrieving credentials from Google One Tap.",
		});

		const cred = GoogleAuthProvider.credential(res.credential);

		try {
			const newUser = await signInWithCredential(getAuth(app), cred).then(initialiseUserData);
			toast("Signed In", { description: newUser ? "Welcome to Setil!" : "Welcome back!", id: persistentToast });
		} catch (error: any) {
			toast.error("Error Signing In", { description: error.code, id: persistentToast });
		}
	},
});
</script>

<template>
	<div class="flex h-full w-full items-center justify-center">
		<Card class="-translate-y-8 w-full max-w-md">
			<CardContent class="flex flex-col items-center gap-6 p-8 sm:p-10 text-center">
				<img src="/icon/icon-192.png" alt="Setil" class="size-16 rounded-2xl shadow-2xl shadow-primary/25" />
				<div class="flex flex-col items-center gap-2">
					<h1 class="font-heading text-3xl font-extrabold tracking-tight">Welcome to Setil</h1>
					<span class="text-sm text-muted-foreground"> Sign in to start splitting expenses with friends </span>
				</div>

				<Separator />

				<ThemedContinueButton @click="signIn()" />

				<span class="text-sm text-muted-foreground">Setil v{{ version }} by Joel Cutler</span>
			</CardContent>
		</Card>
	</div>
</template>
