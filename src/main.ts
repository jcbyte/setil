import { createApp } from "vue";
import GoogleSignInPlugin from "vue3-google-signin";
import AppWrapper from "./AppWrapper.vue";
import router from "./router";
import "./style.css";

const app = createApp(AppWrapper);

app.use(router);
app.use(GoogleSignInPlugin, {
	clientId: "913646123341-o4kstu61a8n1iiicq3i3olnc6h960u6u.apps.googleusercontent.com",
});

app.mount("#app");
