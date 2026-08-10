import { app } from "@/firebase/firebase";
import { initialiseUserData } from "@/firebase/firestore/user";
import { requestNotifications } from "@/firebase/messaging";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import { Capacitor } from "@capacitor/core";
import {
	signOut as firebaseSignOut,
	getAuth,
	GoogleAuthProvider,
	onAuthStateChanged,
	signInWithCredential,
	signInWithPopup,
	type User,
	type UserCredential,
} from "firebase/auth";
import { readonly, ref } from "vue";
import { toast } from "vue-sonner";

const auth = getAuth(app);
const user = ref<User | null>(auth.currentUser);
const isAuthReady = ref(false);

onAuthStateChanged(auth, (currentUser) => {
	user.value = currentUser;
	isAuthReady.value = true;

	if (currentUser) requestNotifications();
});

function errorDescription(error: unknown): string {
	if (error instanceof Error) return error.message;
	if (typeof error === "object" && error !== null) {
		if ("message" in error && error.message) return String(error.message);
		if ("code" in error && error.code) return String(error.code);
	}
	if (typeof error === "string") return error;
	return "An unknown error occurred";
}

async function completeSignIn(signInOperation: () => Promise<UserCredential>, description: string): Promise<void> {
	const persistentToast = toast.loading("Signing In", { description });

	try {
		await signInOperation();
		const newUser = await initialiseUserData();

		toast("Signed In", {
			description: newUser ? "Welcome to Setil!" : "Welcome back!",
			id: persistentToast,
		});
	} catch (error) {
		toast.error("Error Signing In", { description: errorDescription(error), id: persistentToast });
	}
}

async function signInNativeApp() {
	const result = await FirebaseAuthentication.signInWithGoogle();
	const idToken = result.credential?.idToken;

	if (!idToken) throw new Error("Google did not return an ID token");

	const credential = GoogleAuthProvider.credential(idToken, result.credential?.accessToken);
	return signInWithCredential(auth, credential);
}

async function signInWithGooglePopup(): Promise<void> {
	if (Capacitor.isNativePlatform()) {
		await completeSignIn(signInNativeApp, "Continue in the Credential Manager");
	} else {
		const provider = new GoogleAuthProvider();
		await completeSignIn(() => signInWithPopup(auth, provider), "Continue in the Popup Window");
	}
}

async function signInWithGoogleCredential(credential: string): Promise<void> {
	const firebaseCredential = GoogleAuthProvider.credential(credential);
	await completeSignIn(() => signInWithCredential(auth, firebaseCredential), "Retrieving Credentials from Google");
}

async function signOut(): Promise<void> {
	try {
		await firebaseSignOut(auth);
		toast("Signed Out", { description: "See you again soon!" });
	} catch (error) {
		toast.error("Error Signing Out", { description: errorDescription(error) });
	}
}

const authService = {
	user: readonly(user),
	isAuthReady: readonly(isAuthReady),
	signInWithGooglePopup,
	signInWithGoogleCredential,
	signOut,
};
export default authService;
