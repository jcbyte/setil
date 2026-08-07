<script setup lang="ts">
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

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
		<Badge
			v-if="balanceStr.status === 'neutral'"
			class="w-fit text-nowrap border-transparent bg-zinc-100 text-zinc-700 shadow-none hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
		>
			{{ balanceStr.str }}
		</Badge>
		<Badge
			v-else-if="balanceStr.status === 'negative'"
			class="w-fit text-nowrap border-transparent bg-rose-100 text-rose-700 shadow-none hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300 dark:hover:bg-rose-950/60"
		>
			{{ balanceStr.str }}
		</Badge>
		<Badge
			v-else
			class="w-fit text-nowrap border-transparent bg-emerald-100 text-emerald-700 shadow-none hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-950/60"
		>
			{{ balanceStr.str }}
		</Badge>
	</template>
	<Skeleton v-else class="w-26 h-5.5" />
</template>
