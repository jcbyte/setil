<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Ghost } from "@lucide/vue";
import { useRouter } from "vue-router";

const router = useRouter();
</script>

<template>
	<!-- 100dvh - 2rem; accounting for `p-4` on all pages from `App.vue` -->
	<div class="flex min-h-[calc(100dvh-2rem)] items-center justify-center">
		<Card class="-translate-y-8 min-w-none sm:min-w-sm">
			<CardContent class="flex flex-col items-center gap-4 p-8">
				<div class="flex size-12 items-center justify-center rounded-full bg-muted">
					<Ghost class="size-6 text-muted-foreground" />
				</div>

				<div class="flex flex-col">
					<span class="text-2xl font-bold text-center">Error 404</span>
					<span class="text-sm text-muted-foreground text-center">This page cannot be found</span>
				</div>

				<Separator />

				<Button type="button" variant="outline" class="min-w-36" @click="router.push('/')">
					<span class="font-semibold">Return Home</span>
				</Button>
			</CardContent>
		</Card>
	</div>
</template>
