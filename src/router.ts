import { createRouter, createWebHistory } from "vue-router";
import GroupDetailsPage from "./pages/GroupDetailsPage.vue";
import GroupListPage from "./pages/groupList/GroupListPage.vue";
import GroupPage from "./pages/groupPage/GroupPage.vue";
import InvitePage from "./pages/InvitePage.vue";
import NotFoundPage from "./pages/NotFoundPage.vue";
import SettleUpPage from "./pages/SettleUpPage.vue";
import TransactionPage from "./pages/TransactionPage.vue";
import PaymentDetailsPage from "./pages/userSettings/PaymentDetailsPage.vue";
import UserSettingsPage from "./pages/userSettings/UserSettingsPage.vue";

const routes = [
	{
		path: "/",
		component: GroupListPage,
		name: "GroupListPage",
	},
	{
		path: "/settings",
		component: UserSettingsPage,
		name: "UserSettingsPage",
	},
	{
		path: "/settings/payment",
		component: PaymentDetailsPage,
		name: "PaymentDetailsPage",
	},
	{
		path: "/create",
		component: GroupDetailsPage,
		name: "CreateGroupPage",
	},
	{
		path: "/group/:groupId/edit",
		component: GroupDetailsPage,
		name: "EditGroupPage",
	},
	{
		path: "/group/:groupId",
		component: GroupPage,
		name: "GroupPage",
	},
	{
		path: "/group/:groupId/transaction",
		component: TransactionPage,
		name: "NewTransactionPage",
	},
	{
		path: "/group/:groupId/transaction/:transactionId",
		component: TransactionPage,
		name: "EditTransactionPage",
	},
	{
		path: "/group/:groupId/settle",
		component: SettleUpPage,
		name: "SettleUpPage",
	},
	{
		path: "/invite/:groupId/:inviteCode",
		component: InvitePage,
		name: "InvitePage",
	},
	{
		// Catch-all route
		path: "/:pathMatch(.*)*",
		component: NotFoundPage,
		name: "NotFound",
	},
];

const router = createRouter({
	history: createWebHistory(),
	routes,
});

export default router;
