import { onSnapshot, Query } from "firebase/firestore";
import { ref, type Ref } from "vue";

/**
 * Composable for subscribing to a Firestore query with live updates.
 *
 * Automatically manages query changes and maintains a reactive record of all documents
 * matching the query. The subscription should be cleaned up via the release function.
 *
 * @template T - The type of documents in the query results
 * @param {Query<T>} query - The Firestore query to subscribe to
 * @param {Function} [onError] - Optional callback for error handling. Called with:
 *   - network: boolean - true if error is network related, false if access related
 * @returns {Object} Object containing:
 *   - items: Reactive ref containing Record of document ids to documents, or null if loading
 *   - release: Function to unsubscribe and clean up the listener
 */
export function useLiveQuery<T>(
	query: Query<T>,
	onError?: (network: boolean) => void,
): { items: Ref<Record<string, T> | null>; release: () => void } {
	const itemsRef = ref<Record<string, T> | null>(null);

	// Create a live listener for the query
	const unsubscribe = onSnapshot(
		query,
		(snapshot) => {
			if (itemsRef.value === null) itemsRef.value = {};
			const map = itemsRef.value;

			// For each change perform the correct action to synchronise our ref with firestore
			snapshot.docChanges().forEach((change) => {
				const docId = change.doc.id;
				if (change.type === "added" || change.type === "modified") {
					map[docId] = change.doc.data();
				} else {
					delete map[docId];
				}
			});
		},
		(error) => {
			// If the firebase error is not related to network provide `network: false`
			if (error.code === "not-found" || error.code === "permission-denied") onError?.(false);
			else onError?.(true);
		},
	);

	return { items: itemsRef, release: unsubscribe };
}
