import { query as firestoreQuery, limit, onSnapshot, type DocumentSnapshot, type Query } from "firebase/firestore";
import { computed, ref, shallowRef, type Ref } from "vue";
import type { ErrorHandler } from "./types";

export interface AcquiredLiveExpandingQuery<T> {
	tupleItems: Ref<[string, T][]>;
	expandBy: (amount: number) => void;
	loaded: Ref<boolean>;
	release: () => void;
}

export function acquireLiveExpandingQuery<T>(query: Query<T>, onError?: ErrorHandler): AcquiredLiveExpandingQuery<T> {
	const rawDocs = shallowRef<DocumentSnapshot<T>[]>([]);
	const loaded = ref(false);

	let requestedLimit = 0;
	let unsubscribe: (() => void) | undefined;

	function expandBy(amount: number) {
		if (amount <= 0) return;

		requestedLimit += amount;

		loaded.value = false;

		unsubscribe?.();
		// Use a single resubscribing expanding query, letting Firestore rebalance the complete loaded set itself
		// This uses n(n+1)d/2 reads for pagination (inefficient!), but saves rebalancing new new documents (difficult)
		// ! Therefore only use when we assume pages are not often traversed! (and pick page size accordingly)
		unsubscribe = onSnapshot(
			firestoreQuery(query, limit(requestedLimit)),
			(snapshot) => {
				rawDocs.value = snapshot.docs;
				loaded.value = true;
			},
			(error) => {
				if (error.code === "not-found" || error.code === "permission-denied") onError?.(false);
				else onError?.(true);
			},
		);
	}

	function release() {
		unsubscribe?.();
		unsubscribe = undefined;
	}

	const tupleItems = computed(() => rawDocs.value.map((doc): [string, T] => [doc.id, doc.data() as T]));

	return { tupleItems, expandBy, loaded, release };
}
