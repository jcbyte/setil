import { VercelRequest, VercelResponse } from "@vercel/node";
import { DecodedIdToken, getAuth } from "firebase-admin/auth";
import { DocumentReference, getFirestore } from "firebase-admin/firestore";
import "./_init/firebaseAdmin.js";
import { decrypt, encrypt, EncryptedData } from "./_utils/crypt";

const db = getFirestore();
const auth = getAuth();

export default async function (req: VercelRequest, res: VercelResponse) {
	if (req.method !== "GET" && req.method !== "POST" && req.method !== "DELETE") {
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

	if (req.method === "GET") {
		const { userId, groupId } = req.query;
		if (!userId) {
			return res.status(400).json({ success: false, error: "Missing parameter `userId`" });
		}
		if (typeof userId !== "string") {
			return res.status(400).json({ success: false, error: "`userId` must be a single value" });
		}

		try {
			if (userId !== user.uid) {
				if (!groupId) {
					return res.status(400).json({ success: false, error: "Missing parameter `groupId`" });
				}
				if (typeof groupId !== "string") {
					return res.status(400).json({ success: false, error: "`groupId` must be a single value" });
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
			const paymentDetailsRef = db.doc(`/users/${userId}/private/paymentDetails`) as DocumentReference<EncryptedData>;
			const paymentDetailsSnap = await paymentDetailsRef.get();
			const encryptedPaymentDetails = paymentDetailsSnap.data();

			if (!encryptedPaymentDetails) {
				return res.status(200).json({ success: true, paymentDetails: null });
			}

			const paymentDetails = decrypt(encryptedPaymentDetails);

			return res.status(200).json({ success: true, paymentDetails });
		} catch (error) {
			return res.status(500).json({ success: false, error: error.message });
		}
	}

	const paymentDetailsRef = db.doc(`/users/${user.uid}/private/paymentDetails`);
	const userPublicDataRef = db.doc(`/users/${user.uid}/public/data`);

	if (req.method === "POST") {
		const { paymentDetails } = req.body;
		if (!paymentDetails) {
			return res.status(400).json({ success: false, error: "Missing parameter `paymentDetails`" });
		}

		// Encrypt and store payment details
		const encryptedPaymentDetails = encrypt(JSON.stringify(paymentDetails));

		await paymentDetailsRef.set(encryptedPaymentDetails);
		await userPublicDataRef.update({ hasBankDetails: true });

		return res.status(200).json({ success: true });
	}

	if (req.method === "DELETE") {
		await userPublicDataRef.update({ hasBankDetails: false });
		await paymentDetailsRef.delete();

		return res.status(200).json({ success: true });
	}
}
