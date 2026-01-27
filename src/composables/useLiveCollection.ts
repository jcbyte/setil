import { CollectionReference } from "firebase/firestore";
import { type Ref } from "vue";
import { useLiveQuery } from "./useLiveQuery";

interface CachedLiveCollection {
	ref: Ref<any>;
	release: () => void;
	refCount: number;
}
/** Cache for active live collection subscriptions across the application. */
const liveCollections = new Map<string, CachedLiveCollection>();

/**
 * Composable for subscribing to a Firestore collection with live updates.
 *
 * Implements internal caching with reference counting to avoid duplicate listeners
 * when multiple components use the same collection. The subscription should be
 * cleaned up via the release function.
 *
 * @template T - The type of documents in the collection
 * @param {CollectionReference<T>} colRef - Reference to the Firestore collection
 * @param {Function} [onError] - Optional callback for error handling.
 *   - network: boolean - true if error is network related, false if access related
 * @returns {Object} Object containing:
 *   - items: Reactive ref containing Record of document IDs to documents, or null if loading
 *   - release: Function to unsubscribe and clean up the listener
 */
export function useLiveCollection<T>(
	colRef: CollectionReference<T>,
	onError?: (network: boolean) => void,
): { items: Ref<Record<string, T> | null>; release: () => void } {
	const colKey = colRef.path;

	function release() {
		const liveColRef = liveCollections.get(colKey);
		if (!liveColRef) return;

		liveColRef.refCount--;
		// If there is no more references, then cleanup
		if (liveColRef.refCount <= 0) {
			liveColRef.release();
			liveCollections.delete(colKey);
		}
	}

	// Use cached collection if it exists
	const cachedColRef = liveCollections.get(colKey);
	if (cachedColRef) {
		cachedColRef.refCount++;
		return { items: cachedColRef.ref, release };
	}

	// Get a live query of this collection
	const { items: itemsRef, release: releaseQuery } = useLiveQuery(colRef, onError);
	liveCollections.set(colKey, { ref: itemsRef, release: releaseQuery, refCount: 1 });

	return { items: itemsRef, release };
}
