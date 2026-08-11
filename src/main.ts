import { createApp } from "vue";
import GoogleSignInPlugin from "vue3-google-signin";
import AppWrapper from "./AppWrapper.vue";
import NotificationPlugin from "./plugins/notifications.js";
import router from "./router";
import "./style.css";
import { initialiseNativeNavigation } from "./util/app.js";

initialiseNativeNavigation();

const app = createApp(AppWrapper);

app.use(router);
app.use(GoogleSignInPlugin, {
	clientId: import.meta.env.VITE_GOOGLE_OAUTH_WEB_CLIENT_ID,
});
app.use(NotificationPlugin);

app.mount("#app");
