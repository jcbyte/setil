import { routes, type VercelConfig } from "@vercel/config/v1";

// ! This is an internal implementation detail, and may break in the future
const isDev = process.env.__VERCEL_DEV_RUNNING === "1";

export const config: VercelConfig = {
	devCommand: "npm run dev:web",
	buildCommand: "npm run build:web",
	rewrites: !isDev ? [routes.rewrite("/(.*)", "/index.html")] : [],
	headers: [
		{
			source: "/api/(.*)",
			headers: [
				{ key: "Access-Control-Allow-Origin", value: "*" },
				{ key: "Access-Control-Allow-Methods", value: "GET, POST, DELETE, OPTIONS" },
				{ key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
			],
		},
	],
};
