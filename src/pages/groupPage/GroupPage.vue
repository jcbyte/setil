<script setup lang="ts">
import Avatar from "@/components/Avatar.vue";
import LoaderIcon from "@/components/LoaderIcon.vue";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import Tabs from "@/components/ui/tabs/Tabs.vue";
import { useToast } from "@/components/ui/toast";
import YourAccountSettings from "@/components/YourAccountSettings.vue";
import useLiveGroupWithUserPublic from "@/composables/useLiveGroupWithUserPublic";
import { inviteUser, noGroup } from "@/util/app";
import { getRouteParam } from "@/util/util";
import { ArrowLeft, ReceiptText, Settings, UserRoundPlus, Wallet } from "lucide-vue-next";
import { ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import GroupActivity from "./GroupActivity.vue";
import GroupSummary from "./GroupSummary.vue";

const route = useRoute();
const router = useRouter();
const { toast } = useToast();
const groupId = getRouteParam(route.params.groupId);

if (!groupId) {
	noGroup(router);
	throw "No groupId";
}
const group = useLiveGroupWithUserPublic(groupId, () => noGroup(router));

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
	if (!groupId) return;
	if (!group.value) return;

	isAddingMember.value = true;
	try {
		await inviteUser(groupId, group.value.data.name);
	} catch (e) {
		toast({ title: "Error Creating Invite Link", description: String(e), variant: "destructive", duration: 5000 });
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
	<div class="w-full flex flex-col gap-4 items-center">
		<div class="w-full flex justify-between items-center">
			<div class="flex gap-2 justify-center items-center">
				<Button variant="ghost" class="size-9" @click="router.push('/')">
					<ArrowLeft class="!size-6" />
				</Button>
				<span v-if="group" class="text-lg font-semibold">{{ group.data.name }}</span>
				<Skeleton v-else class="w-20 h-7" />
			</div>
			<div class="flex gap-2 justify-center items-center">
				<YourAccountSettings />
				<Button variant="outline" class="size-9" @click="router.push(`/group/${groupId}/edit`)">
					<Settings class="!size-5" />
				</Button>
			</div>
		</div>

		<div class="flex flex-col justify-center md:flex-row gap-2 w-full">
			<div class="flex-1 flex flex-col gap-2 w-full md:max-w-[36rem]">
				<Tabs v-model:model-value="currentTab">
					<TabsList class="grid w-full grid-cols-2">
						<TabsTrigger v-for="tab in tabOrder" :value="tab">{{ tabSettings[tab].title }}</TabsTrigger>
					</TabsList>
				</Tabs>
				<div v-if="group" class="relative" @touchstart="tabViewTouchStart" @touchend="tabViewTouchEnd">
					<Transition :name="tabTransition" mode="out-in">
						<GroupSummary v-if="currentTab === 'summary'" :group="group" />
						<GroupActivity v-else-if="currentTab === 'activity'" :group-id="groupId" :group="group" />
					</Transition>
				</div>
				<Skeleton v-else class="w-full h-96" />

				<div class="flex w-full gap-2">
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
						<div class="flex flex-col justify-center items-center gap-2">
							<div class="bg-secondary p-3 rounded-lg aspect-square flex justify-center items-center">
								<component :is="groupButton.icon" class="!size-7" />
							</div>
							<div class="flex flex-col justify-center items-center">
								<span class="text-md font-semibold">{{ groupButton.title }}</span>
								<span class="text-sm text-muted-foreground">{{ groupButton.description }}</span>
							</div>
						</div>
					</Button>
				</div>
			</div>

			<div
				v-if="group"
				class="border border-border rounded-lg p-4 flex flex-col gap-2 h-fit w-full md:w-auto md:max-w-72 lg:max-w-96"
			>
				<div class="flex flex-col">
					<span class="text-lg font-semibold">Group Info</span>
					<span v-if="group.data.description" class="text-sm text-muted-foreground">Description</span>
					<span v-if="group.data.description" class="text-sm">{{ group.data.description }}</span>
				</div>
				<div class="flex flex-col gap-1">
					<span class="text-sm text-muted-foreground font-semibold">
						Members ({{ Object.values(group.users).filter((user) => user.status === "active").length }})
					</span>
					<div class="flex gap-2 flex-wrap">
						<div
							v-if="group.users"
							v-for="user in Object.values(group.users).filter((user) => user.status === 'active')"
							class="flex gap-1 justify-center items-center"
						>
							<Avatar :src="user.public?.photoUrl ?? null" :name="user.nickname" class="size-7" />
							<span class="text-sm">{{ user.nickname }}</span>
						</div>
					</div>
				</div>
				<Button variant="outline" :disabled="isAddingMember" @click="addMember">
					<LoaderIcon :icon="UserRoundPlus" :loading="isAddingMember" />
					<span>Add Member</span>
				</Button>
			</div>
			<Skeleton v-else class="h-64 w-full md:max-w-72 lg:max-w-96" />
		</div>
	</div>
</template>
