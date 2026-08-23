<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getBooleanEnv } from "@/util/util";
import { ArrowLeft, Coffee, ExternalLink } from "@lucide/vue";
import { RouterLink } from "vue-router";

const SHOW_TIPPING = !getBooleanEnv(import.meta.env.VITE_DISABLE_TIPPING);
</script>

<template>
	<div class="h-full mx-auto w-full max-w-5xl flex flex-col gap-4">
		<header class="flex items-center justify-between gap-4 py-1 sm:py-2">
			<RouterLink to="/" class="flex items-center gap-2">
				<img src="/icon/icon-96.png" alt="" class="size-9 rounded-sm shadow-lg shadow-primary/15" />
				<span class="font-heading text-lg font-extrabold tracking-tight">Setil</span>
			</RouterLink>

			<div class="flex items-center gap-1">
				<RouterLink to="/about"><Button variant="ghost">About</Button></RouterLink>
				<a
					href="https://github.com/jcbyte/setil"
					target="_blank"
					rel="noopener noreferrer"
					:class="SHOW_TIPPING ? 'hidden sm:inline-flex' : 'inline-flex'"
				>
					<Button variant="ghost"><ExternalLink class="size-4" />Source</Button>
				</a>
				<a v-if="SHOW_TIPPING" href="https://github.com/jcbyte/setil" target="_blank" rel="noopener noreferrer">
					<Button variant="secondary"><Coffee class="size-4" />Buy me a Coffee</Button>
				</a>
			</div>
		</header>

		<main class="flex-1">
			<slot />
		</main>

		<footer class="pb-1">
			<Separator class="mb-4" />
			<div class="flex justify-between items-center gap-4">
				<RouterLink to="/">
					<Button variant="link" class="px-1 text-sm text-muted-foreground">
						<ArrowLeft class="size-4" />
						Back to Setil
					</Button>
				</RouterLink>
				<div class="flex gap-2">
					<RouterLink to="/privacy">
						<Button variant="link" class="px-1 text-sm text-muted-foreground">Privacy</Button>
					</RouterLink>
					<RouterLink to="/support">
						<Button variant="link" class="px-1 text-sm text-muted-foreground">Support</Button>
					</RouterLink>
				</div>
			</div>
		</footer>
	</div>
</template>
