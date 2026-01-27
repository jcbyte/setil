import { app } from "@/firebase/firebase";
import { getAuth, type User } from "firebase/auth";
import { ref, type Ref } from "vue";

const auth = getAuth(app);
const currentUser = ref<User | null>(auth.currentUser);

auth.onAuthStateChanged((user) => {
	currentUser.value = user;
});

/**
 * Composable to return the current firebase user.
 *
 * @return {Ref<User | null>} Reactive ref containing the user data or null if the user is not initialised/not logged in
 */
export function useCurrentUser(): Ref<User | null> {
	return currentUser;
}
