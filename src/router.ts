import { createRouter, createWebHistory } from "vue-router";
import CreateGroupPage from "./pages/groupDetails/CreateGroupPage.vue";
import EditGroupPage from "./pages/groupDetails/EditGroupPage.vue";
import GroupListPage from "./pages/groupList/GroupListPage.vue";
import GroupPage from "./pages/groupPage/GroupPage.vue";
import InvitePage from "./pages/InvitePage.vue";
import NotFoundPage from "./pages/NotFoundPage.vue";
import AboutPage from "./pages/public/AboutPage.vue";
import DeleteAccountPage from "./pages/public/DeleteAccountPage.vue";
import PrivacyPage from "./pages/public/PrivacyPage.vue";
import SupportPage from "./pages/public/SupportPage.vue";
import SettleUpPage from "./pages/SettleUpPage.vue";
import CreateTransactionPage from "./pages/transactionPage/CreateTransactionPage.vue";
import EditTransactionPage from "./pages/transactionPage/EditTransactionPage.vue";
import PaymentDetailsPage from "./pages/userSettings/PaymentDetailsPage.vue";
import UserSettingsPage from "./pages/userSettings/UserSettingsPage.vue";

const routes = [
	{
		path: "/about",
		component: AboutPage,
		name: "AboutPage",
		meta: { public: true },
	},
	{
		path: "/privacy",
		component: PrivacyPage,
		name: "PrivacyPage",
		meta: { public: true },
	},
	{
		path: "/support",
		component: SupportPage,
		name: "SupportPage",
		meta: { public: true },
	},
	{
		path: "/delete-account",
		component: DeleteAccountPage,
		name: "DeleteAccountPage",
		meta: { public: true },
	},
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
		component: CreateGroupPage,
		name: "CreateGroupPage",
	},
	{
		path: "/group/:groupId/edit",
		component: EditGroupPage,
		name: "EditGroupPage",
	},
	{
		path: "/group/:groupId",
		component: GroupPage,
		name: "GroupPage",
	},
	{
		path: "/group/:groupId/transaction",
		component: CreateTransactionPage,
		name: "NewTransactionPage",
	},
	{
		path: "/group/:groupId/transaction/:transactionId",
		component: EditTransactionPage,
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
		meta: { public: true },
	},
];

const router = createRouter({
	history: createWebHistory(),
	routes,
});

export default router;
