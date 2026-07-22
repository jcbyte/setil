import { cert, initializeApp } from "firebase-admin/app";

if (!process.env.FIREBASE_PROJECT_ID) {
	throw new Error("Environment variable `FIREBASE_PROJECT_ID` is not set.");
}
if (!process.env.FIREBASE_PRIVATE_KEY) {
	throw new Error("Environment variable `FIREBASE_PRIVATE_KEY` is not set.");
}
if (!process.env.FIREBASE_CLIENT_EMAIL) {
	throw new Error("Environment variable `FIREBASE_CLIENT_EMAIL` is not set.");
}

initializeApp({
	credential: cert({
		// type: process.env.FIREBASE_TYPE,
		projectId: process.env.FIREBASE_PROJECT_ID,
		// private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
		privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
		clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
		// client_id: process.env.FIREBASE_CLIENT_ID,
		// auth_uri: process.env.FIREBASE_AUTH_URI,
		// token_uri: process.env.FIREBASE_TOKEN_URI,
		// auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
		// client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
		// universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN,
	}),
});
