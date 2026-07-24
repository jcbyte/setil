import { VercelResponse } from "@vercel/node";
import { DecodedIdToken, getAuth } from "firebase-admin/auth";

import "../_init/firebaseAdmin.js";

const auth = getAuth();

export async function authenticateUser(
	authHeader: string | undefined,
	res: VercelResponse,
): Promise<DecodedIdToken | undefined> {
	// Extract jwt
	let jwt: string | undefined;
	if (authHeader && authHeader.startsWith("Bearer ")) {
		jwt = authHeader.split(" ")[1];
	}
	if (!jwt) {
		res.status(401).json({ success: false, error: "Missing authorisation token" });
		return;
	}

	// Get user who performed the request
	try {
		const user = await auth.verifyIdToken(jwt);
		return user;
	} catch (e) {
		res.status(401).json({ success: false, error: "Unauthorized" });
		return;
	}
}
