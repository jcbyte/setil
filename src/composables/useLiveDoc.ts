import { onSnapshot, type DocumentReference, type Unsubscribe } from "firebase/firestore";
import { shallowRef, type Ref } from "vue";

interface CachedLiveDoc {
	ref: Ref<any>;
	unsubscribe: Unsubscribe;
	refCount: number;
}
/** Cache for active live document subscriptions across the application. */
const liveDocs = new Map<string, CachedLiveDoc>();

/**
 * Composable for subscribing to a single Firestore document with live updates.
 *
 * Implements internal caching with reference counting to avoid duplicate listeners
 * when multiple components use the same document. The subscription should be cleaned
 * up via the release function.
 *
 * @template T - The type of the document data
 * @param {DocumentReference<T>} docRef - Reference to the Firestore document
 * @param {Function} [onError] - Optional callback for error handling. Called with:
 *   - network: boolean - true if error is network related, false if access related
 * @returns {Object} Object containing:
 *   - data: Reactive ref containing the document data or null
 *   - release: Function to unsubscribe and clean up the listener
 */
export function useLiveDoc<T>(
	docRef: DocumentReference<T>,
	onError?: (network: boolean) => void,
): { data: Ref<T | null>; release: () => void } {
	const docKey = docRef.path;

	function release() {
		const liveDocRef = liveDocs.get(docKey);
		if (!liveDocRef) return;

		liveDocRef.refCount--;
		// IF there is no more references, then cleanup
		if (liveDocRef.refCount <= 0) {
			liveDocRef.unsubscribe();
			liveDocs.delete(docKey);
		}
	}

	// Used cached doc if it exists
	const cachedLiveDoc = liveDocs.get(docKey);
	if (cachedLiveDoc) {
		cachedLiveDoc.refCount++;
		return { data: cachedLiveDoc.ref, release };
	}

	const dataRef = shallowRef<T | null>(null);

	// Create a live document with snapshot callback
	const unsubscribe = onSnapshot(
		docRef,
		(snapshot) => {
			if (!snapshot.exists()) {
				dataRef.value = null;
				onError?.(false);
				return;
			}

			dataRef.value = snapshot.data();
		},
		(error) => {
			// If the firebase error is not related to network provide `network: false`
			if (error.code === "not-found" || error.code === "permission-denied") onError?.(false);
			else onError?.(true);
		},
	);

	liveDocs.set(docKey, { ref: dataRef, unsubscribe, refCount: 1 });

	return { data: dataRef, release };
}
