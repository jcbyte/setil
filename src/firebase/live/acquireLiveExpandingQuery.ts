import { query as firestoreQuery, limit, startAfter, type Query } from "firebase/firestore";
import { computed, ref, type Ref, type UnwrapRef } from "vue";
import { acquireLiveQuery } from "./acquireLiveQuery";

type LiveQueryResult<T> = ReturnType<typeof acquireLiveQuery<T>>;

export function acquireLiveExpandingQuery<T>(
	query: Query<T>,
	onError?: (network: boolean) => void,
): { tupleItems: Ref<[string, T][]>; expandBy: (amount: number) => void; loaded: Ref<boolean>; release: () => void } {
	const queries = ref<LiveQueryResult<T>[]>([]);

	function expandBy(amount: number) {
		const startQueryConstraint = [];
		const lastQuery = queries.value.at(-1);
		if (lastQuery && !lastQuery?.loaded) return;
		const lastDoc = lastQuery?.rawDocs.at(-1);
		if (lastDoc) startQueryConstraint.push(startAfter(lastDoc));

		const newQuery = firestoreQuery(query, ...startQueryConstraint, limit(amount));
		queries.value.push(acquireLiveQuery(newQuery, onError) as unknown as UnwrapRef<LiveQueryResult<T>>);
	}

	function release() {
		queries.value.forEach((q) => q.release());
		queries.value = [];
	}

	const tupleItems = computed(() => queries.value.flatMap((q) => q.tupleItems));
	const loaded = computed(() => queries.value.every((q) => q.loaded));

	return { tupleItems, expandBy, loaded, release };
}
