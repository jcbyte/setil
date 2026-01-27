import { useWindowSize } from "@vueuse/core";
import { computed } from "vue";

type Breakpoint = "2xl" | "xl" | "lg" | "md" | "sm" | "xs";
const breakpointSizes: Record<Breakpoint, number> = {
	"2xl": 1536,
	xl: 1280,
	lg: 1024,
	md: 768,
	sm: 640,
	xs: 0,
};

/**
 * Provides reactive current breakpoint detection.
 *
 * @returns {Object} Object containing:
 *   - currentBreakpoint: Computed ref with current breakpoint `Breakpoint`
 *   - breakpointSplit: Function to choose a value based on breakpoint threshold
 */
export function useScreenSize() {
	const { width } = useWindowSize();

	const currentBreakpoint = computed<Breakpoint>(() => {
		return Object.entries(breakpointSizes).reduce<Breakpoint>(
			(currentBreakpoint, [breakpointSize, size]) =>
				width.value > size && size > breakpointSizes[currentBreakpoint]
					? (breakpointSize as Breakpoint)
					: currentBreakpoint,
			"xs",
		);
	});

	function split<T>(smaller: T, larger: T, breakpoint: Breakpoint): T {
		return width.value >= breakpointSizes[breakpoint] ? larger : smaller;
	}

	return { currentBreakpoint, breakpointSplit: split };
}
