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

async function initialiseNativeUrlOpen() {
	await App.addListener("appUrlOpen", (event) => {
		const url = new URL(event.url);
		const targetPath = `${url.pathname}${url.search}${url.hash}`;
		router.push(targetPath || "/");
	});
}

async function initialiseNativeAndroidBackNavigation() {
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
	if (!Capacitor.isNativePlatform()) return Promise.resolve();
	if (initPromise) return initPromise;

	const initialisations: Promise<void>[] = [];
	initialisations.push(initialiseNativeUrlOpen());
	if (Capacitor.getPlatform() === "android") initialisations.push(initialiseNativeAndroidBackNavigation());

	initPromise = Promise.all(initialisations)
		.then(() => {})
		.catch((e) => {
			initPromise = undefined;
			throw e;
		});
	return initPromise;
}
