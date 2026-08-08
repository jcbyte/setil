<script setup lang="ts">
import Avatar from "@/components/Avatar.vue";
import LoaderIcon from "@/components/LoaderIcon.vue";
import NavCard from "@/components/NavCard.vue";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import Tabs from "@/components/ui/tabs/Tabs.vue";
import YourAccountSettings from "@/components/YourAccountSettings.vue";
import useLiveGroupWithUserPublic from "@/composables/useLiveGroupWithUserPublic";
import { inviteUser, noGroup } from "@/util/app";
import { getRouteParam, getStatusUsers } from "@/util/util";
import { ArrowLeft, ReceiptText, Settings, UserRoundPlus, Wallet } from "@lucide/vue";
import { computed, ref, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import { toast } from "vue-sonner";
import GroupActivity from "./GroupActivity.vue";
import GroupSummary from "./GroupSummary.vue";

const route = useRoute();
const router = useRouter();
const groupId = computed(() => getRouteParam(route.params.groupId));

const group = useLiveGroupWithUserPublic(groupId, () => noGroup(router));

const activeUsers = computed(() => {
	if (!group.value?.users) return {};
	return getStatusUsers(group.value.users, new Set(["active"]));
});

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

watch(currentTab, (newTab) => router.push({ query: { tab: newTab }, replace: true }));

const isAddingMember = ref<boolean>(false);

async function addMember() {
	if (!groupId.value || !group.value || !group.value.data) return;

	isAddingMember.value = true;
	try {
		await inviteUser(groupId.value, group.value.data.name);
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
			<div class="flex items-center gap-1 min-w-0">
				<RouterLink to="/">
					<Button type="button" variant="ghost" size="icon">
						<ArrowLeft class="size-5.5" />
					</Button>
				</RouterLink>
				<span v-if="group?.data" class="text-lg font-semibold truncate">{{ group.data.name }}</span>
				<Skeleton v-else class="w-28 h-7" />
			</div>
			<div class="flex items-center gap-2">
				<RouterLink :to="`/group/${groupId}/edit`">
					<Button type="button" variant="outline" class="size-9 sm:size-auto">
						<Settings />
						<span class="hidden sm:inline">Group Settings</span>
					</Button>
				</RouterLink>
				<YourAccountSettings />
			</div>
		</div>

		<div class="flex flex-col md:flex-row gap-3">
			<div class="flex-1 flex flex-col gap-3">
				<Tabs v-model:model-value="currentTab">
					<TabsList class="grid grid-cols-2">
						<TabsTrigger v-for="tab in tabOrder" :key="tab" :value="tab">{{ tabSettings[tab].title }}</TabsTrigger>
					</TabsList>
				</Tabs>

				<div v-if="groupId && group" class="relative" @touchstart="tabViewTouchStart" @touchend="tabViewTouchEnd">
					<Transition :name="tabTransition" mode="out-in">
						<GroupSummary v-if="currentTab === 'summary'" :group="group" />
						<GroupActivity v-else-if="currentTab === 'activity'" :group-id="groupId" :group="group" />
					</Transition>
				</div>
				<Skeleton v-else class="w-full h-56" />

				<div class="grid grid-cols-2 gap-3">
					<NavCard
						v-for="groupButton in [
							{
								icon: ReceiptText,
								title: 'Add Expense',
								description: 'Record a new expense',
								link: `/group/${groupId}/transaction`,
							},
							{
								icon: Wallet,
								title: 'Setil Up',
								description: 'Settle member\'s debts',
								link: `/group/${groupId}/settle`,
							},
						]"
						:key="groupButton.title"
						:to="groupButton.link"
						hide-chevron
						class="p-3.5 flex flex-row items-center gap-3"
					>
						<div
							class="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground"
						>
							<component :is="groupButton.icon" class="size-5" />
						</div>
						<div class="flex min-w-0 flex-col items-start">
							<span class="w-full truncate font-semibold">{{ groupButton.title }}</span>
							<span class="w-full truncate text-xs text-muted-foreground">
								{{ groupButton.description }}
							</span>
						</div>
					</NavCard>
				</div>
			</div>

			<Card v-if="group?.data" class="h-fit min-w-68 md:max-w-92">
				<CardHeader>
					<CardTitle>Group Info</CardTitle>
					<CardDescription v-if="group.data.description">{{ group.data.description }}</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="flex flex-col gap-1.5">
						<span v-if="group.users" class="text-sm font-semibold mx-0.5"> {{ activeUsers.length }} Members </span>
						<Skeleton v-else class="inline-block align-middle w-22 h-5 mx-0.5" />

						<div v-if="group.users" class="flex flex-col gap-1">
							<div v-for="(user, userId) in activeUsers" :key="userId" class="flex gap-1 items-center">
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
					<Button type="button" variant="secondary" class="w-full" :disabled="isAddingMember" @click="addMember">
						<LoaderIcon :icon="UserRoundPlus" :loading="isAddingMember" />
						<span>Add Member</span>
					</Button>
				</CardFooter>
			</Card>
			<Skeleton v-else class="h-82 w-full min-w-68 md:max-w-92" />
		</div>
	</div>
</template>
