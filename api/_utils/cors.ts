import { VercelRequest, VercelResponse } from "@vercel/node";

export function handlePreflight(req: VercelRequest, res: VercelResponse): boolean {
	// Required as cross-origin clients send a preflight request
	// before requests that include the Authorization header
	if (req.method === "OPTIONS") {
		res.status(204).end();
		return true;
	}

	return false;
}
