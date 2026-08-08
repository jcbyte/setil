import { createApp } from "vue";
import GoogleSignInPlugin from "vue3-google-signin";
import AppWrapper from "./AppWrapper.vue";
import router from "./router";
import "./style.css";

const app = createApp(AppWrapper);

app.use(router);
app.use(GoogleSignInPlugin, {
	clientId: import.meta.env.VITE_GOOGLE_OAUTH_WEB_CLIENT_ID,
});

app.mount("#app");
