import { createApp } from "vue";
import AppWrapper from "./AppWrapper.vue";
import router from "./router";
import "./style.css";

const app = createApp(AppWrapper);

app.use(router);

// const pinia = createPinia();
// app.use(pinia);

app.mount("#app");
