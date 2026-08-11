<script setup lang="ts">
import { Toaster } from "@/components/ui/sonner";
import authService from "@/util/authService.js";
import { LoaderCircle } from "@lucide/vue";
import { useColorMode } from "@vueuse/core";
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import SignInPage from "./pages/SignInPage.vue";

const { user: currentUser, isAuthReady } = authService;

// Skip custom page animations when the browser displays one, i.e. iOS swipe back
const route = useRoute();
const skipPageTransition = ref(false);

function handleNavigate(event: NavigateEvent) {
	skipPageTransition.value = event.hasUAVisualTransition;
}
onMounted(() => {
	window.navigation?.addEventListener("navigate", handleNavigate);
});
onBeforeUnmount(() => {
	window.navigation?.removeEventListener("navigate", handleNavigate);
});

watch(
	() => route.path,
	async () => {
		await nextTick();
		skipPageTransition.value = false;
	},
);

const resolvedTheme = useColorMode().state;
</script>

<template>
	<Transition name="loader-anim">
		<div
			v-if="isAuthReady || route.meta.public"
			class="min-h-dvh flex justify-center p-4 pb-10 sm:p-6 sm:pb-12 lg:p-8 lg:pb-14"
		>
			<Transition name="fade-slide" mode="out-in">
				<!-- Extra div so that `Transition` is not directly trying to control `router-view` -->
				<div v-if="currentUser || route.meta.public" class="w-full">
					<router-view v-slot="{ Component }">
						<!-- Ensure mode is not 'out-in' when disabling css, as we do not want a transition lifecycle -->
						<Transition name="fade-slide" :mode="!skipPageTransition ? 'out-in' : 'default'" :css="!skipPageTransition">
							<component :is="Component" class="overflow-visible" />
						</Transition>
					</router-view>
				</div>
				<div v-else class="w-full">
					<SignInPage />
				</div>
			</Transition>
		</div>

		<div v-else class="fixed inset-0 -translate-y-8 flex flex-col justify-center items-center gap-4">
			<img src="/icon/icon-192.png" alt="App Logo" class="size-20 rounded-3xl shadow-2xl shadow-primary/25" />
			<div class="flex gap-2 items-center">
				<LoaderCircle :stroke-width="3" class="animate-spin text-muted-foreground" />
				<p class="text-lg font-bold text-muted-foreground">Initialising Setil</p>
			</div>
		</div>
	</Transition>

	<Toaster
		:theme="resolvedTheme"
		position="bottom-center"
		rich-colors
		close-button
		close-button-position="top-right"
		:duration="6000"
	/>
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
	transform: translateY(-100%);
}
</style>

<style>
/* Slide left (default) */
.fade-slide-enter-active,
.fade-slide-leave-active {
	transition: 0.18s cubic-bezier(0.22, 1, 0.36, 1);
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
	transition: 0.18s cubic-bezier(0.22, 1, 0.36, 1);
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
