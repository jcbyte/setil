import { routes, type VercelConfig } from "@vercel/config/v1";

// ! This is an internal implementation detail, and may break in the future
const isDev = process.env.__VERCEL_DEV_RUNNING === "1";

export const config: VercelConfig = {
	rewrites: !isDev ? [routes.rewrite("/(.*)", "/index.html")] : [],
};
