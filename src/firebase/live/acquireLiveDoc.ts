import { onSnapshot, type DocumentReference, type Unsubscribe } from "firebase/firestore";
import { ref, shallowRef, type Ref } from "vue";
import type { ErrorHandler } from "./types";

interface CachedLiveDoc {
	ref: Ref<any>;
	loaded: Ref<boolean>;
	unsubscribe: Unsubscribe;
	refCount: number;
	errorHandlers: Set<ErrorHandler>;
}
/** Cache for active live document subscriptions across the application. */
const liveDocs = new Map<string, CachedLiveDoc>();

export interface AcquiredLiveDoc<T> {
	data: Ref<T | null>;
	loaded: Ref<boolean>;
	release: () => void;
}

/**
 * Functions for subscribing to a single Firestore document with live updates.
 *
 * Implements internal caching with reference counting to avoid duplicate listeners
 * when multiple components use the same document. The subscription should be cleaned
 * up via the release function.
 *
 * @template T - The type of the document data
 * @param {DocumentReference<T>} docRef - Reference to the Firestore document
 * @param {Function} [onError] - Optional callback for error handling. Called with:
 *   - network: boolean - true if error is network related, false if access related
 * @returns {AcquiredLiveDoc<T>} Object containing:
 *   - data: Reactive ref containing the document data or null if loading
 *   - loaded: Reactive ref indicating if the items have been loaded
 *   - release: Function to unsubscribe and clean up the listener
 */
export function acquireLiveDoc<T>(docRef: DocumentReference<T>, onError?: ErrorHandler): AcquiredLiveDoc<T> {
	const docKey = docRef.path;

	let released = false;
	function release() {
		const liveDocRef = liveDocs.get(docKey);
		if (!liveDocRef) return;

		if (released) return;
		released = true;

		liveDocRef.refCount--;
		if (onError) liveDocRef.errorHandlers.delete(onError);

		// If there is no more references, then cleanup
		if (liveDocRef.refCount <= 0) {
			liveDocRef.unsubscribe();
			liveDocs.delete(docKey);
		}
	}

	// Used cached doc if it exists
	const cachedLiveDoc = liveDocs.get(docKey);
	if (cachedLiveDoc) {
		cachedLiveDoc.refCount++;
		if (onError) cachedLiveDoc.errorHandlers.add(onError);
		return { data: cachedLiveDoc.ref, loaded: cachedLiveDoc.loaded, release };
	}

	const dataRef = shallowRef<T | null>(null);
	const loaded = ref<boolean>(false);

	const errorHandlers = new Set<ErrorHandler>();
	if (onError) errorHandlers.add(onError);

	// Create a live document with snapshot callback
	const unsubscribe = onSnapshot(
		docRef,
		(snapshot) => {
			if (!snapshot.exists()) {
				dataRef.value = null;
				errorHandlers.forEach((handler) => handler(false));
				return;
			}

			dataRef.value = snapshot.data();

			// Once this is performed once the data has been loaded
			loaded.value = true;
		},
		(error) => {
			// If the firebase error is not related to network provide `network: false`
			const nw = error.code !== "not-found" && error.code !== "permission-denied";
			errorHandlers.forEach((handler) => handler(nw));
		},
	);

	liveDocs.set(docKey, {
		ref: dataRef,
		loaded,
		unsubscribe,
		refCount: 1,
		errorHandlers,
	});

	return { data: dataRef, loaded, release };
}
