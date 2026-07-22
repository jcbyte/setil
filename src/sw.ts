/// <reference lib="webworker" />

import { initializeApp } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";
import { clientsClaim } from "workbox-core";
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import firebaseConfig from "./firebase/config";

declare const self: ServiceWorkerGlobalScope & {
	__WB_MANIFEST: Array<unknown>;
};
self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// Handle messages when in the background
onBackgroundMessage(messaging, (payload) => {
	if (!payload.data) return;

	const { title, body, route } = payload.data;
	const notificationOptions: NotificationOptions = {
		body,
		icon: "https://setil.vercel.app/icon/icon-192.png",
		badge: "https://setil.vercel.app/icon/mask-monochrome-96.png",
		data: {
			route,
		},
	};

	self.registration.showNotification(title, notificationOptions);
});

// Handle clicking on a notification
self.addEventListener("notificationclick", (event) => {
	// CLose the notification once clicked on
	event.notification.close();

	const url = self.location.origin;
	// Extract the route
	const { route } = event.notification.data;
	const wantedRoute = route ? `${url}${route}` : url;

	// Check if the app is already open
	event.waitUntil(
		self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
			// If there's already an open client (window) then use it
			const openClient = clientList.find((client) => new URL(client.url).origin === url);
			if (openClient) {
				openClient.focus();
				openClient.navigate(wantedRoute);
			} else {
				// If not then open the URL in a new window/tab
				self.clients.openWindow(wantedRoute ?? url);
			}
		}),
	);
});
