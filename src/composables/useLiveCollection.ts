import { CollectionReference } from "firebase/firestore";
import { type Ref } from "vue";
import { useLiveQuery } from "./useLiveQuery";

interface CachedLiveCollection {
	ref: Ref<any>;
	release: () => void;
	refCount: number;
}
const liveCollections = new Map<string, CachedLiveCollection>();

export function useLiveCollection<T>(
	colRef: CollectionReference<T>,
	onError?: () => void,
): { items: Ref<Record<string, T> | null>; release: () => void } {
	const colKey = colRef.path;

	function release() {
		const liveColRef = liveCollections.get(colKey);
		if (!liveColRef) return;

		liveColRef.refCount--;
		if (liveColRef.refCount <= 0) {
			liveColRef.release();
			liveCollections.delete(colKey);
		}
	}

	const cachedColRef = liveCollections.get(colKey);
	if (cachedColRef) {
		cachedColRef.refCount++;
		return { items: cachedColRef.ref, release };
	}

	const { items: itemsRef, release: releaseQuery } = useLiveQuery(colRef, onError);
	liveCollections.set(colKey, { ref: itemsRef, release: releaseQuery, refCount: 1 });

	return { items: itemsRef, release };
}
