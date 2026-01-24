import { next, rewrite } from "@vercel/edge";

export default async function middleware(req: Request) {
	const underMaintenance = process.env.UNDER_MAINTENANCE?.toUpperCase() === "TRUE";

	if (underMaintenance) {
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
