export function getLastUpdatedStr(timestamp: number): string {
	const secondsNow: number = Math.floor(Date.now() / 1000);
	const deltaTime = secondsNow - timestamp;

	const intervals: { label: string; seconds: number }[] = [
		{ label: "year", seconds: 31536000 },
		{ label: "month", seconds: 2592000 },
		{ label: "week", seconds: 604800 },
		{ label: "day", seconds: 86400 },
		{ label: "hour", seconds: 3600 },
		{ label: "minute", seconds: 60 },
	];

	const interval = intervals.find(({ seconds }) => Math.floor(deltaTime / seconds) >= 1);

	if (interval) {
		const count = Math.floor(deltaTime / interval.seconds);
		return `Updated ${count} ${interval.label}${count > 1 ? "s" : ""} ago`;
	}

	return "Updated just now";
}
