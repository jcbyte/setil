import { CollectionReference } from "firebase/firestore";
import { computed, type Ref } from "vue";
import { acquireLiveQuery } from "./acquireLiveQuery";
import type { ErrorHandler } from "./types";

interface CachedLiveCollection {
	rec: Ref<Record<string, any>>;
	loaded: Ref<boolean>;
	release: () => void;
	refCount: number;
	errorHandlers: Set<ErrorHandler>;
}
/** Cache for active live collection subscriptions across the application. */
const liveCollections = new Map<string, CachedLiveCollection>();

export interface AcquiredLiveCollection<T> {
	items: Ref<Record<string, T>>;
	loaded: Ref<boolean>;
	release: () => void;
}

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
 * @returns {AcquiredLiveCollection<T>} Object containing:
 *   - items: Reactive ref containing Record of document IDs to documents, or null if loading
 *   - loaded: Reactive ref indicating if the items have been loaded
 *   - release: Function to unsubscribe and clean up the listener
 */
export function acquireLiveCollection<T>(
	colRef: CollectionReference<T>,
	onError?: ErrorHandler,
): AcquiredLiveCollection<T> {
	const colKey = colRef.path;

	let released = false;
	function release() {
		const liveColRef = liveCollections.get(colKey);
		if (!liveColRef) return;

		if (released) return;
		released = true;

		liveColRef.refCount--;
		if (onError) liveColRef.errorHandlers.delete(onError);

		// If there is no more references, then cleanup
		if (liveColRef.refCount <= 0) {
			liveColRef.release();
			liveCollections.delete(colKey);
		}
	}

	// Use cached collection if it exists
	const cachedCol = liveCollections.get(colKey);
	if (cachedCol) {
		cachedCol.refCount++;
		if (onError) cachedCol.errorHandlers.add(onError);
		return { items: cachedCol.rec, loaded: cachedCol.loaded, release };
	}

	const errorHandlers = new Set<ErrorHandler>();
	if (onError) errorHandlers.add(onError);

	// Get a live query of this collection
	const {
		tupleItems,
		loaded,
		release: releaseQuery,
	} = acquireLiveQuery(colRef, (nw) => errorHandlers.forEach((handler) => handler(nw)));
	const items = computed<Record<string, T>>(() => Object.fromEntries(tupleItems.value));
	liveCollections.set(colKey, { rec: items, loaded, release: releaseQuery, refCount: 1, errorHandlers });

	return { items, loaded, release };
}
