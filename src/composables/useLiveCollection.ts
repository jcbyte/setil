import { CollectionReference, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { ref, type Ref } from "vue";

interface CachedLiveCollection {
	ref: Ref<any>;
	unsubscribe: Unsubscribe;
	refCount: number;
}
const liveCollections = new Map<string, CachedLiveCollection>();

export function useLiveCollection<T>(
	colRef: CollectionReference<T>,
	onError?: () => void
): { items: Ref<Record<string, T> | null>; release: () => void } {
	const colKey = colRef.path;

	function release() {
		const liveColRef = liveCollections.get(colKey);
		if (!liveColRef) return;

		liveColRef.refCount--;
		if (liveColRef.refCount <= 0) {
			liveColRef.unsubscribe();
			liveCollections.delete(colKey);
		}
	}

	const cachedColRef = liveCollections.get(colKey);
	if (cachedColRef) {
		cachedColRef.refCount++;
		return { items: cachedColRef.ref, release };
	}

	const itemsRef = ref<Record<string, T> | null>(null);

	const unsubscribe = onSnapshot(
		colRef,
		(snapshot) => {
			if (itemsRef.value === null) itemsRef.value = {};
			const map = itemsRef.value;

			snapshot.docChanges().forEach((change) => {
				const docId = change.doc.id;
				if (change.type === "added" || change.type === "modified") {
					map[docId] = change.doc.data();
				} else {
					delete map[docId];
				}
			});
		},
		(_error) => {
			onError?.();
		}
	);

	liveCollections.set(colKey, { ref: itemsRef, unsubscribe, refCount: 1 });

	return { items: itemsRef, release };
}
