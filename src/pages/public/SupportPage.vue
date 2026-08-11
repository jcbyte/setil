<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CircleHelp, ExternalLink, Mail, ShieldAlert } from "@lucide/vue";
import { RouterLink } from "vue-router";
import PublicPageLayout from "./PublicPageLayout.vue";
</script>

<template>
	<PublicPageLayout>
		<div class="mx-auto max-w-3xl flex flex-col gap-2">
			<span class="px-1 text-xs sm:text-sm font-bold uppercase tracking-widest text-primary">Help</span>
			<span class="font-heading text-4xl font-extrabold tracking-tight sm:text-5xl">Setil Support</span>

			<span class="py-4 text-lg leading-relaxed text-muted-foreground">
				Setil is an open-source application designed for cost splitting developed by Joel Cutler. This Privacy Policy
				outlines how your information is handled when you use the app, why it is needed, and the choices available to
				you.
			</span>

			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<Card>
					<CardHeader>
						<CardTitle class="flex items-center gap-2">
							<Mail class="size-6 text-primary" />
							Email support
						</CardTitle>
						<CardDescription>For account or product specific questions.</CardDescription>
					</CardHeader>
					<CardContent>
						<a href="mailto:joelcutler108@gmail.com?subject=Setil%20Support">
							<Button>Send an Email</Button>
						</a>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle class="flex items-center gap-2">
							<ExternalLink class="size-6 text-primary" />
							Report an issue
						</CardTitle>
						<CardDescription>For reproducible bugs and feature requests.</CardDescription>
					</CardHeader>
					<CardContent>
						<a href="https://github.com/jcbyte/setil/issues" target="_blank" rel="noopener noreferrer">
							<Button variant="outline">Open GitHub Issues</Button>
						</a>
					</CardContent>
				</Card>

				<Card class="col-span-full">
					<CardHeader>
						<CardTitle class="flex items-center gap-2">
							<CircleHelp class="size-6 text-primary" />
							What to include
						</CardTitle>
					</CardHeader>
					<CardContent>
						<ul class="list-disc space-y-2 pl-5 text-muted-foreground">
							<li>What you expected and what happened.</li>
							<li>Which platform you use (native Android or Web/PWA).</li>
							<li>Your app, Android, or browser version, if known.</li>
							<li>Relevant screenshots.</li>
						</ul>
					</CardContent>
				</Card>

				<div
					class="col-span-full flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm"
				>
					<ShieldAlert class="size-5 text-amber-600 dark:text-amber-400" />
					<span class="font-semibold">Keep sensitive information private.</span>
					<span>Do not email passwords, bank details, or sign-in codes.</span>
				</div>
			</div>

			<span class="text-sm text-muted-foreground">
				For data-handling information, check the
				<RouterLink to="/privacy">
					<Button variant="link" class="p-0 text-foreground"> Privacy Policy </Button> </RouterLink
				>.
			</span>
		</div>
	</PublicPageLayout>
</template>
