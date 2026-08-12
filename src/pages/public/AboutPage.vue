<script setup lang="ts">
import BalanceStrBadge, { type BalanceStr } from "@/components/BalanceStrBadge.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils.js";
import {
	ArrowRight,
	Bell,
	Calculator,
	Cloud,
	Code2,
	Coffee,
	House,
	Parasol,
	Plane,
	Plus,
	RefreshCw,
	Split,
	Wallet,
	type LucideProps,
} from "@lucide/vue";
import type { FunctionalComponent } from "vue";
import { RouterLink } from "vue-router";
import PublicPageLayout from "./PublicPageLayout.vue";

type LucideIcon = FunctionalComponent<LucideProps, {}, any, {}>;

const exampleGroup: {
	name: string;
	icon: LucideIcon;
	people: { initial: string; name: string; balance: BalanceStr; avatar: string }[];
} = {
	name: "Cornwall Trip",
	icon: Parasol,
	people: [
		{
			initial: "J",
			name: "Joel",
			balance: { str: "is owed £42.50", status: "positive" },
			avatar: "bg-primary/15 text-primary",
		},
		{
			initial: "E",
			name: "Emily",
			balance: { str: "owes £18.00", status: "negative" },
			avatar: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
		},
		{
			initial: "P",
			name: "Paul",
			balance: { str: "owes £24.50", status: "negative" },
			avatar: "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
		},
	],
};

const occasions: { icon: LucideIcon; label: string }[] = [
	{ icon: Plane, label: "Group Trips" },
	{ icon: House, label: "Housemates" },
	{ icon: Coffee, label: "Everyday Plans" },
];

const features: { icon: LucideIcon; title: string; description: string }[] = [
	{
		icon: Calculator,
		title: "Smart Settlement",
		description: "Uses a greedy algorithm to simplify complex debts into the fewest possible payments.",
	},
	{
		icon: RefreshCw,
		title: "Real-time",
		description: "Balances and transactions update instantly across all devices, powered by Firestore.",
	},
	{
		icon: Split,
		title: "Flexible Splitting",
		description: "Split transactions between multiple people equally, by ratio, or define specific amounts.",
	},
	{
		icon: Bell,
		title: "Notifications",
		description: "Push notifications for new members, transactions, and payments.",
	},
	{
		icon: Cloud,
		title: "Native Experience",
		description: "Fully native Android experience, or installable as a PWA on iOS, Android, and Desktop.",
	},
	{
		icon: Code2,
		title: "Modern Stack",
		description: "Built in TypeScript with Vue 3, Vite, shadcn/vue Tailwind CSS, Firebase and Vercel.",
	},
];
</script>

<template>
	<PublicPageLayout>
		<div class="flex flex-col gap-18 lg:gap-22 py-8 md:py-12 lg:py-16">
			<div class="grid items-center gap-10 grid-cols-1 md:grid-cols-2">
				<div class="flex flex-col gap-6">
					<div
						class="flex flex-col max-w-3xl font-heading text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-12 sm:leading-14 lg:leading-18 tracking-tight"
					>
						<span>Split Costs.</span>
						<span class="text-primary">Setil Simply.</span>
					</div>
					<span class="max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
						Setil is an open source, expense splitting app. Create a group, invite friends, and add expenses in seconds.
						See everyone's balance in real-time, and settle the group with fewer payments.
					</span>
					<div class="flex gap-3">
						<RouterLink to="/">
							<Button size="lg">
								Start Splitting
								<ArrowRight />
							</Button>
						</RouterLink>
						<a href="https://github.com/jcbyte/setil" target="_blank" rel="noopener noreferrer">
							<Button size="lg" variant="secondary">
								<Code2 />
								View Source
							</Button>
						</a>
					</div>
				</div>

				<!-- Fake Group Expenses -->
				<div class="hidden md:block relative mx-auto w-full max-w-md">
					<Card class="rotate-2 overflow-hidden shadow-2xl shadow-primary/10">
						<div class="flex items-center justify-between border-b bg-muted/35 px-4 py-2">
							<div class="flex items-center gap-2">
								<div class="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
									<component :is="exampleGroup.icon" class="size-4" />
								</div>
								<span class="font-semibold">{{ exampleGroup.name }}</span>
							</div>
							<Badge variant="outline" class="bg-background/70">{{ exampleGroup.people.length }} members</Badge>
						</div>
						<CardHeader>
							<CardTitle>Balances</CardTitle>
							<CardDescription>Who owes what in this group</CardDescription>
						</CardHeader>
						<CardContent class="flex flex-col gap-6">
							<div class="flex flex-col gap-2">
								<div
									v-for="person in exampleGroup.people"
									:key="person.name"
									class="flex items-center justify-between gap-2"
								>
									<div class="flex items-center gap-2">
										<span
											:class="
												cn('flex size-8 items-center justify-center rounded-full text-xs font-bold', person.avatar)
											"
										>
											{{ person.initial }}
										</span>
										<span>{{ person.name }}</span>
									</div>
									<BalanceStrBadge :balance-str="person.balance" />
								</div>
							</div>
							<div class="flex gap-2">
								<Button class="flex-1" variant="outline">
									<Plus />
									Add expense
								</Button>
								<Button class="flex-1">
									<Wallet />
									Setil up
								</Button>
							</div>
						</CardContent>
					</Card>
					<div class="absolute -inset-8 -z-10 bg-primary/10 blur-3xl" />
				</div>
			</div>

			<div class="flex flex-col gap-6 text-center">
				<div class="flex flex-col gap-2">
					<span class="px-1 text-xs sm:text-sm font-bold uppercase tracking-widest text-primary">
						However you share
					</span>
					<span class="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight">
						Weekend trips to monthly bills.
					</span>
					<span class="mx-auto max-w-2xl text-lg text-muted-foreground">
						Setil keeps the group's expenses organised and balances clear. No more receipts and repayments getting lost
						in the group chat.
					</span>
				</div>
				<div class="flex flex-wrap gap-3">
					<div
						v-for="occasion in occasions"
						:key="occasion.label"
						class="flex-1 shrink-0 flex items-center justify-center gap-3 rounded-2xl border bg-card/60 p-5 font-semibold shadow-sm"
					>
						<component :is="occasion.icon" class="size-5 text-primary" />
						<span class="text-nowrap">{{ occasion.label }}</span>
					</div>
				</div>
			</div>

			<div class="flex flex-col gap-6">
				<div class="flex flex-col gap-2">
					<span class="px-1 text-xs sm:text-sm font-bold uppercase tracking-widest text-primary">
						Simple by choice
					</span>
					<span class="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight">
						Practical by design. Open by nature.
					</span>
					<span class="text-lg text-muted-foreground">
						Setil combines a focused group expense workflow with a modern, open source TypeScript stack.
					</span>
				</div>
				<div class="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
					<Card v-for="feature in features" :key="feature.title" class="h-full">
						<CardHeader>
							<CardTitle class="flex items-center gap-2">
								<component :is="feature.icon" class="size-5 text-primary" />
								{{ feature.title }}
							</CardTitle>
						</CardHeader>
						<CardContent class="leading-relaxed text-muted-foreground">{{ feature.description }}</CardContent>
					</Card>
				</div>
			</div>
		</div>
	</PublicPageLayout>
</template>
