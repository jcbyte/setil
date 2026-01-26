<script setup lang="ts">
import { Separator } from "@/components/ui/separator";
const version = __APP_VERSION__;
</script>

<template>
	<div class="flex justify-center items-center p-4">
		<div class="flex flex-col items-center justify-center gap-3 border border-border p-8 rounded-lg min-w-80">
			<div class="flex flex-col items-center justify-center">
				<span class="text-2xl font-bold text-center">Setil will be back soon! 🚧</span>
				<span class="text-muted-foreground text-center">Currently undergoing maintenance.</span>
			</div>
			<Separator />
			<span class="text-sm text-muted-foreground text-center">Setil v{{ version }} by Joel Cutler</span>
		</div>
	</div>
</template>
