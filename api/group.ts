import { VercelRequest, VercelResponse } from "@vercel/node";
import { DecodedIdToken, getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

import "./_init/firebaseAdmin.js";

const db = getFirestore();
const auth = getAuth();

export default async function (req: VercelRequest, res: VercelResponse) {
	if (req.method !== "DELETE") {
		return res.status(405).json({ success: false, error: "Method Not Allowed" });
	}

	// Extract parameters
	const authHeader = req.headers.authorization;
	let jwt: string | undefined;
	if (authHeader && authHeader.startsWith("Bearer ")) {
		jwt = authHeader.split(" ")[1];
	}
	if (!jwt) {
		return res.status(401).json({ success: false, error: "Missing authorisation token" });
	}

	// Get user who performed the request
	let user: DecodedIdToken | undefined;
	try {
		user = await auth.verifyIdToken(jwt);
	} catch (e) {
		return res.status(401).json({ success: false, error: "Unauthorized" });
	}

	if (req.method === "DELETE") {
		const { groupId } = req.query;
		if (!groupId) {
			return res.status(400).json({ success: false, error: "Missing parameter `groupId`" });
		}

		const groupRef = db.doc(`groups/${groupId}`); // as DocumentReference<GroupData>;
		const groupSnap = await groupRef.get();
		const groupData = groupSnap.data();
		if (!groupData) {
			return res.status(404).json({ success: false, error: `Group '${groupId}' not found` });
		}

		if (groupData.owner !== user.uid) {
			return res.status(401).json({ success: false, error: "Unauthorized; You are not the group owner" });
		}

		// Perform recursive delete
		await db.recursiveDelete(groupRef);

		return res.status(200).json({ success: true });
	}
}
