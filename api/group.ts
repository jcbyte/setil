import { VercelRequest, VercelResponse } from "@vercel/node";
import { DocumentReference, getFirestore } from "firebase-admin/firestore";
import { GroupData } from "./_types/firestore.js";
import { authenticateUser } from "./_utils/auth.js";

import "./_init/firebaseAdmin.js";
import { handlePreflight } from "./_utils/cors.js";

const db = getFirestore();

export default async function (req: VercelRequest, res: VercelResponse) {
	if (handlePreflight(req, res)) return;

	if (req.method !== "DELETE") {
		res.setHeader("Allow", "DELETE, OPTIONS");
		return res.status(405).json({ success: false, error: "Method Not Allowed" });
	}

	const user = await authenticateUser(req.headers.authorization, res);
	if (!user) return;

	if (req.method === "DELETE") {
		const { groupId } = req.query;
		if (!groupId) {
			return res.status(400).json({ success: false, error: "Missing parameter `groupId`" });
		}

		const groupRef = db.doc(`groups/${groupId}`) as DocumentReference<GroupData>;
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
