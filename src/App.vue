<script setup lang="ts">
import Toaster from "@/components/ui/toast/Toaster.vue";
import { useCurrentUser } from "@/composables/useCurrentUser.ts";
import { getAuth } from "firebase/auth";
import { LoaderCircle } from "lucide-vue-next";
import { ref } from "vue";
import NotificationRequester from "./components/NotificationRequester.vue";
import SignInPage from "./pages/SignInPage.vue";

const firebaseLoaded = ref(false);
const { currentUser, currentUserInitialised } = useCurrentUser();

const auth = getAuth();
auth.onAuthStateChanged(() => {
	firebaseLoaded.value = true;
});
</script>

<template>
	<Transition name="loader-anim">
		<div v-if="firebaseLoaded" class="flex justify-center items-center p-4">
			<Transition name="fade-slide" mode="out-in">
				<SignInPage v-if="!currentUser || !currentUserInitialised" />
				<!-- Extra div so that `Transition` is not directly trying to control `router-view` -->
				<div v-else class="w-full overflow-hidden">
					<NotificationRequester />
					<router-view v-slot="{ Component }">
						<Transition name="fade-slide" mode="out-in">
							<component :is="Component" class="overflow-visible" />
						</Transition>
					</router-view>
				</div>
			</Transition>
		</div>

		<div v-else class="fixed top-12 flex flex-col justify-center items-center gap-4 w-full p-4">
			<img src="/icon/icon-192.png" alt="App Logo" class="size-24" />
			<div class="flex gap-2 items-center">
				<LoaderCircle :stroke-width="3" class="animate-spin text-muted-foreground" />
				<p class="text-lg font-bold text-muted-foreground">Initialising Setil</p>
			</div>
		</div>
	</Transition>

	<Toaster />
</template>

<style scoped>
.loader-anim-enter-active,
.loader-anim-leave-active {
	transition: 0.2s ease;
}

.loader-anim-enter-from {
	opacity: 0;
}

.loader-anim-leave-to {
	transform: translateY(calc(-100% - 3rem));
}
</style>

<style>
/* Slide left (default) */
.fade-slide-enter-active,
.fade-slide-leave-active {
	transition: 0.1s ease;
}

.fade-slide-enter-from {
	opacity: 0;
	transform: translateX(-1rem);
}
.fade-slide-leave-to {
	opacity: 0;
	transform: translateX(1rem);
}

/* Slide right */
.fade-slide-right-enter-active,
.fade-slide-right-leave-active {
	transition: 0.1s ease;
}

.fade-slide-right-enter-from {
	opacity: 0;
	transform: translateX(1rem);
}
.fade-slide-right-leave-to {
	opacity: 0;
	transform: translateX(-1rem);
}
</style>
