import { DocumentSnapshot, onSnapshot, Query } from "firebase/firestore";
import { computed, ref, shallowRef, type Ref } from "vue";

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
 *   - items: Reactive ref containing Record of document ids to documents
 *   - loaded: Reactive ref indicating if the items have been loaded
 *   - release: Function to unsubscribe and clean up the listener
 */
export function acquireLiveQuery<T>(
	query: Query<T>,
	onError?: (network: boolean) => void,
): {
	tupleItems: Ref<[string, T][]>;
	rawDocs: Ref<DocumentSnapshot<T>[]>;
	loaded: Ref<boolean>;
	release: () => void;
} {
	const rawDocs = shallowRef<DocumentSnapshot<T>[]>([]);
	const loaded = ref<boolean>(false);

	// Create a live listener for the query
	const unsubscribe = onSnapshot(
		query,
		(snapshot) => {
			rawDocs.value = snapshot.docs;
			// Once this is performed once the data has been loaded
			loaded.value = true;
		},
		(error) => {
			// If the firebase error is not related to network provide `network: false`
			if (error.code === "not-found" || error.code === "permission-denied") onError?.(false);
			else onError?.(true);
		},
	);

	const tupleItems = computed(() => rawDocs.value.map((doc): [string, T] => [doc.id, doc.data() as T]));

	return { tupleItems, rawDocs, loaded, release: unsubscribe };
}
