import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import "./firebase";
import { app } from "./firebase";
import { initialiseUserData } from "./firestore/user";

export async function signInWithGoogle(): Promise<boolean> {
	const provider = new GoogleAuthProvider();

	return signInWithPopup(getAuth(app), provider).then(() => initialiseUserData());
}

export async function firebaseSignOut(): Promise<void> {
	return signOut(getAuth(app));
}
