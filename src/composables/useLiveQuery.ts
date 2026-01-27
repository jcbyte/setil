import { onSnapshot, Query } from "firebase/firestore";
import { ref, type Ref } from "vue";

export function useLiveQuery<T>(
	query: Query<T>,
	onError?: (network: boolean) => void,
): { items: Ref<Record<string, T> | null>; release: () => void } {
	const itemsRef = ref<Record<string, T> | null>(null);

	const unsubscribe = onSnapshot(
		query,
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
			onError?.(true);
		},
	);

	return { items: itemsRef, release: unsubscribe };
}
