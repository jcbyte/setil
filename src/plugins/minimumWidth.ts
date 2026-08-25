import { type Plugin } from "vue";

const MinimumWidthPlugin: Plugin<[{ minWidth?: number }]> = {
	install(_app, options = {}) {
		const minWidth = options.minWidth ?? 410;
		initialiseMinimumWidth(minWidth);
	},
};
export default MinimumWidthPlugin;

function updateScale(minWidth: number) {
	const currentWidth = window.innerWidth;

	if (currentWidth < minWidth) {
		// Apply zoom directly to the HTML element to emulate minWidth screen
		document.documentElement.style.zoom = (currentWidth / minWidth).toString();
	} else {
		// Remove the zoom when above the minimum width to return to normal
		document.documentElement.style.removeProperty("zoom");
	}
}

function initialiseMinimumWidth(minWidth: number) {
	const handleResize = () => updateScale(minWidth);

	// Run immediately and update whenever the screen resizes
	handleResize();
	window.addEventListener("resize", handleResize);
}
