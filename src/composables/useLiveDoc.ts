import { onSnapshot, type DocumentReference, type Unsubscribe } from "firebase/firestore";
import { shallowRef, type Ref } from "vue";

interface CachedLiveDoc {
	ref: Ref<any>;
	unsubscribe: Unsubscribe;
	refCount: number;
}
const liveDocs = new Map<string, CachedLiveDoc>();

export function useLiveDoc<T>(
	docRef: DocumentReference<T>,
	onError?: () => void
): { data: Ref<T | null>; release: () => void } {
	const docKey = docRef.path;

	function release() {
		const liveDocRef = liveDocs.get(docKey);
		if (!liveDocRef) return;

		liveDocRef.refCount--;
		if (liveDocRef.refCount <= 0) {
			liveDocRef.unsubscribe();
			liveDocs.delete(docKey);
		}
	}

	const cachedLiveDoc = liveDocs.get(docKey);
	if (cachedLiveDoc) {
		cachedLiveDoc.refCount++;
		return { data: cachedLiveDoc.ref, release };
	}

	const dataRef = shallowRef<T | null>(null);

	const unsubscribe = onSnapshot(
		docRef,
		(snapshot) => {
			if (!snapshot.exists()) {
				dataRef.value = null;
				onError?.();
				return;
			}

			dataRef.value = snapshot.data();
		},
		(_error) => {
			onError?.();
		}
	);

	liveDocs.set(docKey, { ref: dataRef, unsubscribe, refCount: 1 });

	return { data: dataRef, release };
}
