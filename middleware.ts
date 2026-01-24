import { next, rewrite } from "@vercel/edge";

export default async function middleware(req: Request) {
	const dev = process.env.VERCEL_ENV !== "production";
	const underMaintenance = process.env.UNDER_MAINTENANCE?.toUpperCase() === "TRUE";

	if (underMaintenance && !dev) {
		const url = new URL(req.url);
		url.pathname = "/maintenance.html";
		return rewrite(url);
	}

	return next();
}

export const config = {
	// Match all paths except internal ones
	matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
