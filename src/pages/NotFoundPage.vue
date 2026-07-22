<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Ghost } from "@lucide/vue";
import { useRouter } from "vue-router";

const router = useRouter();
</script>

<template>
	<div class="flex min-h-dvh items-center justify-center p-4">
		<div class="flex w-full max-w-sm flex-col items-center gap-4 rounded-lg border border-border p-8 -mt-16">
			<div class="flex size-12 items-center justify-center rounded-full bg-muted">
				<Ghost class="size-6 text-muted-foreground" />
			</div>

			<div class="flex flex-col">
				<span class="text-2xl font-bold text-center">Error 404</span>
				<span class="text-sm text-muted-foreground text-center"> This page cannot be found </span>
			</div>

			<Separator />

			<Button variant="outline" class="min-w-36" @click="router.push('/')">
				<span class="font-semibold">Return Home</span>
			</Button>
		</div>
	</div>
</template>
