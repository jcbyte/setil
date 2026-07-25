<script setup lang="ts">
import Card from "@/components/ui/card/Card.vue";
import CardContent from "@/components/ui/card/CardContent.vue";
import { Separator } from "@/components/ui/separator";
import { Wrench } from "@lucide/vue";

const version = __APP_VERSION__;
</script>

<template>
	<div class="flex min-h-dvh items-center justify-center">
		<Card class="-mt-16">
			<CardContent class="flex flex-col items-center gap-4 p-8">
				<div class="flex size-12 items-center justify-center rounded-full bg-muted">
					<Wrench class="size-6 text-muted-foreground" />
				</div>

				<div class="flex flex-col">
					<span class="text-2xl font-bold text-center">Setil will be back soon</span>
					<span class="text-sm text-muted-foreground text-center"> Currently undergoing maintenance</span>
					<span class="text-sm text-muted-foreground text-center"> Please check back shortly</span>
				</div>

				<Separator />

				<span class="text-sm text-muted-foreground">Setil v{{ version }} by Joel Cutler</span>
			</CardContent>
		</Card>
	</div>
</template>
