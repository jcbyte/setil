import { createApp } from "vue";
import GoogleSignInPlugin from "vue3-google-signin";
import AppWrapper from "./AppWrapper.vue";
import MinimumWidthPlugin from "./plugins/minimumWidth.js";
import NativeNavigationPlugin from "./plugins/nativeNavigation.js";
import NotificationPlugin from "./plugins/notifications.js";
import router from "./router";
import "./style.css";

const app = createApp(AppWrapper);

app.use(router);
app.use(GoogleSignInPlugin, {
	clientId: import.meta.env.VITE_GOOGLE_OAUTH_WEB_CLIENT_ID,
});
app.use(NotificationPlugin);
app.use(NativeNavigationPlugin);
app.use(MinimumWidthPlugin, {
	minWidth: 410,
});

app.mount("#app");
