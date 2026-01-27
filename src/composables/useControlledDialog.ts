import { ref, type Ref } from "vue";

/**
 * Composable for managing the state of a dialog.
 *
 * @template T - The type of optional data to pass through the dialog (defaults to undefined)
 * @param {T} [data] - Optional initial data to store in the dialog
 * @returns {Object} Dialog control object containing:
 *   - open: Reactive boolean for dialog visibility
 *   - processing: Reactive boolean for processing/loading state
 *   - data: Reactive ref containing the dialog data
 *   - openDialog: Function to open dialog and optionally set data
 *   - closeDialog: Function to close the dialog
 *   - startDialogProcessing: Function to set processing state to true
 *   - finishDialogProcessing: Function to set processing state to false
 */
export function useControlledDialog<T = undefined>(
	data?: T,
): {
	open: Ref<boolean>;
	processing: Ref<boolean>;
	openDialog: (data?: T) => void;
	startDialogProcessing: () => void;
	finishDialogProcessing: () => void;
	closeDialog: () => void;
	data: Ref<T | undefined>;
} {
	const open = ref<boolean>(false);
	const processing = ref<boolean>(false);
	const dialogData = ref<T | undefined>(data) as Ref<T | undefined>;

	function openDialog(data?: T) {
		processing.value = false;
		if (data) dialogData.value = data;
		open.value = true;
	}

	function startDialogProcessing() {
		processing.value = true;
	}

	function finishDialogProcessing() {
		processing.value = false;
	}

	function closeDialog() {
		open.value = false;
	}

	return {
		open,
		processing,
		openDialog,
		startDialogProcessing,
		finishDialogProcessing,
		closeDialog,
		data: dialogData,
	};
}
