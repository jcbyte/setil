import { createApp } from "vue";
import AppWrapper from "./AppWrapper.vue";
import router from "./router";
import "./style.css";

const app = createApp(AppWrapper);

app.use(router);

app.mount("#app");
