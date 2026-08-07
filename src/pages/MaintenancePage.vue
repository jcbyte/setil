<script setup lang="ts">
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Wrench } from "@lucide/vue";

const version = __APP_VERSION__;
</script>

<template>
	<main class="flex min-h-dvh w-full items-center justify-center p-4 sm:p-6">
		<Card class="-translate-y-8">
			<CardContent class="flex flex-col items-center gap-6 p-8 sm:p-10 text-center">
				<div
					class="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-2xl shadow-primary/25"
				>
					<Wrench class="size-8" />
				</div>

				<div class="flex flex-col items-center gap-2">
					<span class="text-xs font-bold uppercase tracking-widest text-primary">Maintenance</span>
					<h1 class="font-heading text-3xl font-extrabold tracking-tight">Setil will be back</h1>
					<span class="max-w-sm text-sm text-muted-foreground">
						We're currently making improvements, please check back shortly
					</span>
				</div>

				<Separator />

				<span class="text-sm text-muted-foreground">Setil v{{ version }} by Joel Cutler</span>
			</CardContent>
		</Card>
	</main>
</template>
