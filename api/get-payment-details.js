import admin from "./firebaseAdmin.js";
import { decrypt } from "./_utils/crypt.js";

const db = admin.firestore();
const auth = admin.auth();
const messaging = admin.messaging();

export default async function (req, res) {
	if (req.method !== "GET") {
		return res.status(405).json({ success: false, error: "Method Not Allowed" });
	}

	// Extract parameters
	const authHeader = req.headers.authorization;
	let jwt;
	if (authHeader && authHeader.startsWith("Bearer ")) {
		jwt = authHeader.split(" ")[1];
	}
	const { userId, groupId } = req.query;
	if (!jwt || !userId) {
		return res.status(400).json({ success: false, error: "Missing parameters" });
	}

	// Get user who performed the request
	let user;
	try {
		user = await auth.verifyIdToken(jwt);
	} catch (e) {
		return res.status(401).json({ success: false, error: "Unauthorized" });
	}

	try {
		if (userId !== user.uid) {
			if (!groupId) {
				return res.status(400).json({ success: false, error: "Missing parameters" });
			}
			// Get list of all userId's who are active in the group (without getting all their data)
			const groupUsersRef = db.collection(`groups/${groupId}/users`);
			const groupUsersMetaSnap = await groupUsersRef.select().get();
			const userIds = groupUsersMetaSnap.docs.map((doc) => doc.id);
			// Verify that us and the other user are both in the group
			if (!userIds.includes(user.uid) || !userIds.includes(userId)) {
				return res.status(401).json({ success: false, error: "Unauthorized" });
			}
		}
	} catch (error) {
		return res.status(500).json({ success: false, error: error.message });
	}

	try {
		const paymentDetailsRef = db.doc(`/users/${userId}/private/paymentDetails`);
		const paymentDetailsSnap = await paymentDetailsRef.get();

		if (!paymentDetailsSnap.exists) {
			return res.status(200).json({ success: true, paymentDetails: JSON.stringify(null) });
		}

		const encryptedPaymentDetails = paymentDetailsSnap.data();
		const paymentDetails = decrypt(encryptedPaymentDetails);

		return res.status(200).json({ success: true, paymentDetails });
	} catch (error) {
		return res.status(500).json({ success: false, error: error.message });
	}
}
