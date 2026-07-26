<script setup lang="ts">
import { Badge } from "@/components/ui/badge";
import Skeleton from "./ui/skeleton/Skeleton.vue";

export interface BalanceStr {
	str: string;
	status: "positive" | "negative" | "neutral";
}

defineProps<{
	balanceStr: BalanceStr | null;
}>();
</script>

<template>
	<template v-if="balanceStr">
		<Badge v-if="balanceStr.status === 'neutral'" variant="secondary" class="w-fit">
			{{ balanceStr.str }}
		</Badge>
		<Badge v-else-if="balanceStr.status === 'negative'" variant="destructive" class="w-fit">
			{{ balanceStr.str }}
		</Badge>
		<Badge v-else variant="default" class="w-fit bg-emerald-600 hover:bg-emerald-700">
			{{ balanceStr.str }}
		</Badge>
	</template>
	<Skeleton v-else class="w-26 h-5.5" />
</template>
