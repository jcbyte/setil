import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { type Plugin } from "vue";
import router from "../router";

let initPromise: Promise<void> | undefined;

const NativeNavigationPlugin: Plugin = {
	install() {
		initialiseNativeNavigation();
	},
};
export default NativeNavigationPlugin;

async function initialiseNativeAndroidNavigation() {
	await App.addListener("backButton", ({ canGoBack }) => {
		if (canGoBack) {
			router.back();
			return;
		}

		void App.exitApp();
	});
}

/** Route Android's system back button through Vue Router. */
export function initialiseNativeNavigation(): Promise<void> {
	if (Capacitor.getPlatform() !== "android") return Promise.resolve();
	if (initPromise) return initPromise;

	initPromise = initialiseNativeAndroidNavigation().catch((e) => {
		initPromise = undefined;
		throw e;
	});
	return initPromise;
}
