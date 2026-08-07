<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Ghost, House } from "@lucide/vue";
</script>

<template>
	<div class="flex h-full w-full items-center justify-center">
		<Card class="-translate-y-8">
			<CardContent class="flex flex-col items-center gap-6 p-8 sm:p-10 text-center">
				<div
					class="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-2xl shadow-primary/25"
				>
					<Ghost class="size-8" />
				</div>

				<div class="flex flex-col items-center gap-2">
					<span class="text-xs font-bold uppercase tracking-widest text-primary">Error 404</span>
					<h1 class="font-heading text-3xl font-extrabold tracking-tight">Page not found</h1>
					<p class="max-w-sm text-sm text-muted-foreground">
						The page may have moved, or the address might be incorrect
					</p>
				</div>

				<Separator />

				<Button type="button" as-child class="min-w-40">
					<RouterLink to="/">
						<House />
						<span>Return home</span>
					</RouterLink>
				</Button>
			</CardContent>
		</Card>
	</div>
</template>
