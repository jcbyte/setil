<script setup lang="ts">
import Avatar from "@/components/Avatar.vue";
import LoaderIcon from "@/components/LoaderIcon.vue";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import CardContent from "@/components/ui/card/CardContent.vue";
import CardDescription from "@/components/ui/card/CardDescription.vue";
import CardFooter from "@/components/ui/card/CardFooter.vue";
import CardHeader from "@/components/ui/card/CardHeader.vue";
import CardTitle from "@/components/ui/card/CardTitle.vue";
import { Skeleton } from "@/components/ui/skeleton";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import Tabs from "@/components/ui/tabs/Tabs.vue";
import YourAccountSettings from "@/components/YourAccountSettings.vue";
import useLiveGroupWithUserPublic from "@/composables/useLiveGroupWithUserPublic";
import { inviteUser, noGroup } from "@/util/app";
import { getRouteParam } from "@/util/split.ts";
import { ArrowLeft, ReceiptText, Settings, UserRoundPlus, Wallet } from "@lucide/vue";
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { toast } from "vue-sonner";
import GroupActivity from "./GroupActivity.vue";
import GroupSummary from "./GroupSummary.vue";

const route = useRoute();
const router = useRouter();
const groupId = getRouteParam(route.params.groupId);

if (!groupId) {
	noGroup(router);
	throw "No groupId";
}
const group = useLiveGroupWithUserPublic(groupId, () => noGroup(router));

const activeUsers = computed(() =>
	group.value.users ? Object.values(group.value.users).filter((user) => user.status === "active") : [],
);

type Tab = "summary" | "activity";
const tabSettings: Record<Tab, { title: string }> = {
	summary: { title: "Summary" },
	activity: { title: "Activity" },
};
const tabOrder: Tab[] = ["summary", "activity"];
const currentTab = ref<Tab>(
	typeof route.query.tab === "string" && tabOrder.includes(route.query.tab as Tab)
		? (route.query.tab as Tab)
		: tabOrder[0],
);

watch(currentTab, (newTab) => router.push({ query: { tab: newTab } }));

const isAddingMember = ref<boolean>(false);

async function addMember() {
	if (!groupId || !group.value || !group.value.data) return;

	isAddingMember.value = true;
	try {
		await inviteUser(groupId, group.value.data.name);
	} catch (e) {
		toast.error("Error Creating Invite Link", { description: String(e) });
	}
	isAddingMember.value = false;
}

let touchStartX = 0;

function tabViewTouchStart(e: TouchEvent) {
	touchStartX = e.changedTouches[0].clientX;
}

function tabViewTouchEnd(e: TouchEvent) {
	const touchEndX = e.changedTouches[0].clientX;
	const deltaX = touchEndX - touchStartX;

	const swipeThreshold = 50; // px

	const originalTabIndex = tabOrder.indexOf(currentTab.value);
	let newTabIndex = originalTabIndex;

	// Swiped right, go to previous tab
	if (deltaX > swipeThreshold) newTabIndex--;
	// Swiped left, go to next tab
	else if (deltaX < -swipeThreshold) newTabIndex++;

	newTabIndex = Math.max(0, Math.min(newTabIndex, tabOrder.length - 1));

	if (newTabIndex != originalTabIndex) {
		currentTab.value = tabOrder[newTabIndex];
	}
}

const tabTransition = ref<"fade-slide" | "fade-slide-right">("fade-slide");

watch(currentTab, (newTab, oldTab) => {
	const oldIndex = tabOrder.indexOf(oldTab);
	const newIndex = tabOrder.indexOf(newTab);
	tabTransition.value = newIndex <= oldIndex ? "fade-slide" : "fade-slide-right";
});
</script>

<template>
	<div class="mx-auto w-full max-w-4xl flex flex-col gap-4">
		<div class="flex justify-between items-center">
			<div class="flex items-center gap-1">
				<Button variant="ghost" size="icon" @click="router.push('/')">
					<ArrowLeft class="!size-5.5" />
				</Button>
				<span v-if="group.data" class="text-lg font-semibold">{{ group.data.name }}</span>
				<Skeleton v-else class="w-28 h-7" />
			</div>
			<div class="flex items-center gap-2">
				<Button variant="outline" class="size-9 sm:size-auto" @click="router.push(`/group/${groupId}/edit`)">
					<Settings />
					<span class="hidden sm:inline">Group Settings</span>
				</Button>
				<YourAccountSettings />
			</div>
		</div>

		<div class="flex flex-col md:flex-row gap-2">
			<div class="flex-1 flex flex-col gap-2">
				<Tabs v-model:model-value="currentTab">
					<TabsList class="grid grid-cols-2">
						<TabsTrigger v-for="tab in tabOrder" :value="tab">{{ tabSettings[tab].title }}</TabsTrigger>
					</TabsList>
				</Tabs>
				<div class="relative" @touchstart="tabViewTouchStart" @touchend="tabViewTouchEnd">
					<Transition :name="tabTransition" mode="out-in">
						<GroupSummary v-if="currentTab === 'summary'" :group="group" />
						<GroupActivity v-else-if="currentTab === 'activity'" :group-id="groupId" :group="group" />
					</Transition>
				</div>

				<div class="flex gap-2">
					<Button
						v-for="groupButton in [
							{
								icon: ReceiptText,
								title: 'Add Expense',
								description: 'Record a new expense',
								onClick: () => router.push(`/group/${groupId}/transaction`),
							},
							{
								icon: Wallet,
								title: 'Setil Up',
								description: 'Settle member\'s debts',
								onClick: () => router.push(`/group/${groupId}/settle`),
							},
						]"
						variant="outline"
						class="h-full flex-1 p-4"
						@click="groupButton.onClick"
					>
						<div class="flex flex-col items-center gap-2">
							<div class="bg-muted p-3 rounded-lg aspect-square flex justify-center items-center">
								<component :is="groupButton.icon" class="!size-6" />
							</div>
							<div class="flex flex-col items-center">
								<span class="text-md font-semibold">{{ groupButton.title }}</span>
								<span class="text-sm text-muted-foreground">{{ groupButton.description }}</span>
							</div>
						</div>
					</Button>
				</div>
			</div>

			<Card v-if="group.data" class="relative h-fit min-w-68 max-w-none md:max-w-96">
				<CardHeader>
					<CardTitle>Group Info</CardTitle>
					<CardDescription v-if="group.data.description">{{ group.data.description }}</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="flex flex-col gap-1.5">
						<span v-if="group.users" class="text-sm font-semibold"> {{ activeUsers.length }} Members </span>
						<Skeleton v-else class="inline w-22 h-5" />

						<div v-if="group.users" class="flex flex-col gap-1">
							<div v-for="user in activeUsers" class="flex gap-1 items-center">
								<Avatar
									v-if="user.computed.name"
									:src="user.public?.photoUrl ?? null"
									:name="user.computed.name"
									class="size-7"
								/>
								<Skeleton v-else class="size-7 rounded-full" />
								<span v-if="user.computed.name" class="text-sm">{{ user.computed.name }}</span>
								<Skeleton v-else class="w-18 h-5" />
							</div>
						</div>
						<div v-else class="flex flex-col gap-1">
							<div v-for="_ in 4" class="flex gap-1 items-center">
								<Skeleton class="size-7 rounded-full" />
								<Skeleton class="w-18 h-5" />
							</div>
						</div>
					</div>
				</CardContent>
				<CardFooter>
					<Button variant="secondary" class="w-full" :disabled="isAddingMember" @click="addMember">
						<LoaderIcon :icon="UserRoundPlus" :loading="isAddingMember" />
						<span>Add Member</span>
					</Button>
				</CardFooter>
			</Card>
			<Skeleton v-else class="h-82 w-68" />
		</div>
	</div>
</template>
