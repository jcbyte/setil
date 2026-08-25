import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { type Plugin } from "vue";
import router from "../router";

const NativeNavigationPlugin: Plugin = {
	install() {
		initialiseNativeNavigation();
	},
};
export default NativeNavigationPlugin;

async function initialiseNativeUrlOpen() {
	await App.addListener("appUrlOpen", (event) => {
		const url = new URL(event.url);
		const targetPath = `${url.pathname}${url.search}${url.hash}`;
		router.push(targetPath || "/");
	});
}

/** Route Android's system back button through Vue Router. */
async function initialiseNativeAndroidBackNavigation() {
	await App.addListener("backButton", ({ canGoBack }) => {
		if (canGoBack) {
			router.back();
			return;
		}

		void App.exitApp();
	});
}

function initialiseNativeNavigation() {
	if (!Capacitor.isNativePlatform()) return;

	initialiseNativeUrlOpen();
	if (Capacitor.getPlatform() === "android") initialiseNativeAndroidBackNavigation();
}
