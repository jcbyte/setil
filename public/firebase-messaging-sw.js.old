importScripts("https://www.gstatic.com/firebasejs/8.2.0/firebase-app.js");
importScripts("https://www.gstatic.com/firebasejs/8.2.0/firebase-messaging.js");

// Your web app's Firebase configuration
const firebaseConfig = {
	apiKey: "AIzaSyDdxl38UXQp0XrXx9ZENB1BjIR2JC2nMr4",
	authDomain: "setil-420xd.firebaseapp.com",
	projectId: "setil-420xd",
	storageBucket: "setil-420xd.firebasestorage.app",
	messagingSenderId: "913646123341",
	appId: "1:913646123341:web:83bdc33b50b509f5dc5f04",
	measurementId: "G-61RDYF85Q1",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
messaging = firebase.messaging();

// Handle messages when in the background
messaging.onBackgroundMessage((payload) => {
	const { title, body, route } = payload.data;
	const notificationOptions = {
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
	const wantedRoute = route && `${url}${route}`;

	// Check if the app is already open
	event.waitUntil(
		clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
			// If there's already an open client (window) then focus on it
			const openClient = clientList.find((client) => new URL(client.url).origin === url);
			if (openClient) {
				openClient.focus();
				// if (wantedRoute) openClient.navigate(wantedRoute); // ! This causes issues as the `openClient` is not being controlled by this sw
			} else {
				// If not then open the URL in a new window/tab
				clients.openWindow(wantedRoute ?? url);
			}
		})
	);
});
