<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { getBooleanEnv } from "@/util/util";
import { Dot } from "@lucide/vue";
import { computed } from "vue";
import { RouterLink } from "vue-router";

const props = defineProps<{
	omittedPages?: PublicPage[];
}>();

export type PublicPage = "about" | "privacy" | "support" | "coffee";

interface PublicPageData {
	label: string;
	href: string;
	class?: string;
}

const publicPageSettings: Record<PublicPage, PublicPageData> = {
	about: { label: "About", href: "/about" },
	privacy: { label: "Privacy Policy", href: "/privacy" },
	support: { label: "Support", href: "/support" },
	coffee: { label: "Buy me a Coffee", href: "https://buymeacoffee.com/joelcutler", class: "text-primary" },
};

const shownPages = computed(() => {
	const omitted = new Set(props.omittedPages);
	// Never show tipping link on android (as Google forbids it)
	if (getBooleanEnv(import.meta.env.VITE_DISABLE_TIPPING)) omitted.add("coffee");

	return Object.entries(publicPageSettings).filter(([pageId]) => !omitted.has(pageId as PublicPage));
});
</script>

<template>
	<div class="flex items-center justify-center gap-0">
		<template v-for="[pageId, page] in shownPages" :key="pageId">
			<component
				:is="page.href.startsWith('http') ? 'a' : RouterLink"
				v-bind="
					page.href.startsWith('http')
						? { href: page.href, target: '_blank', rel: 'noopener noreferrer' }
						: { to: page.href }
				"
				class="justify-self-end"
			>
				<Button variant="link" class="text-sm leading-relaxed px-2 text-muted-foreground" :class="page.class">
					{{ page.label }}
				</Button>
			</component>
			<Dot class="size-4 text-muted-foreground last:hidden" />
		</template>
	</div>
</template>
