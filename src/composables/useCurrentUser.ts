import authService from "@/util/authService";

// todo remove this
/**
 * Composable to return the current firebase user.
 *
 * @return {Ref<User | null>} Reactive ref containing the user data or null if the user is not initialised/not logged in
 */
export function useCurrentUser() {
	return authService.user;
}
