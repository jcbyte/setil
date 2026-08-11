<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { Dot } from "@lucide/vue";
import { computed } from "vue";
import { RouterLink } from "vue-router";

const props = defineProps<{
	omittedPages?: PublicPage[];
}>();

export type PublicPage = "about" | "privacy" | "support";

interface PublicPageData {
	label: string;
	href: string;
}

const publicPageSettings: Record<PublicPage, PublicPageData> = {
	about: { label: "About", href: "/about" },
	privacy: { label: "Privacy Policy", href: "/privacy" },
	support: { label: "Support", href: "/support" },
};

const shownPages = computed(() =>
	Object.entries(publicPageSettings).filter(([pageId]) => !props.omittedPages?.includes(pageId as PublicPage)),
);
</script>

<template>
	<div class="flex items-center justify-center gap-0">
		<template v-for="[pageId, page] in shownPages" :key="pageId">
			<RouterLink :to="page.href" class="justify-self-end">
				<Button variant="link" class="text-sm leading-relaxed px-2 text-muted-foreground">
					{{ page.label }}
				</Button>
			</RouterLink>
			<Dot class="size-4 text-muted-foreground last:hidden" />
		</template>
	</div>
</template>
