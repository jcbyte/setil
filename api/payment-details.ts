import { VercelRequest, VercelResponse } from "@vercel/node";
import { DocumentReference, getFirestore } from "firebase-admin/firestore";
import { PaymentDetailsPostBody } from "../shared/types/api.js";
import { PublicUserData } from "./_types/firestore.js";
import { authenticateUser } from "./_utils/auth.js";
import { decrypt, encrypt, EncryptedData } from "./_utils/crypt.js";

import "./_init/firebaseAdmin.js";

const db = getFirestore();

export default async function (req: VercelRequest, res: VercelResponse) {
	if (req.method !== "GET" && req.method !== "POST" && req.method !== "DELETE") {
		return res.status(405).json({ success: false, error: "Method Not Allowed" });
	}

	const user = await authenticateUser(req.headers.authorization, res);
	if (!user) return;

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
				const groupUsersMetaSnap = await groupUsersRef.where("status", "==", "active").select().get();
				const userIds = groupUsersMetaSnap.docs.map((doc) => doc.id);
				// Verify that us and the other user are both in the group
				if (!userIds.includes(user.uid) || !userIds.includes(userId)) {
					return res.status(401).json({ success: false, error: "Unauthorized" });
				}
			}
		} catch (error) {
			return res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
		}

		try {
			const paymentDetailsRef = db.doc(`/users/${userId}/private/paymentDetails`) as DocumentReference<EncryptedData>;
			const paymentDetailsSnap = await paymentDetailsRef.get();
			const encryptedPaymentDetails = paymentDetailsSnap.data();

			if (!encryptedPaymentDetails) {
				return res.status(200).json({ success: true, paymentDetails: null });
			}

			const paymentDetailsObj = decrypt(encryptedPaymentDetails);
			const paymentDetails = JSON.parse(paymentDetailsObj);

			return res.status(200).json({ success: true, paymentDetails });
		} catch (error) {
			return res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
		}
	}

	const paymentDetailsRef = db.doc(`/users/${user.uid}/private/paymentDetails`) as DocumentReference<EncryptedData>;
	const userPublicDataRef = db.doc(`/users/${user.uid}/public/data`) as DocumentReference<PublicUserData>;

	if (req.method === "POST") {
		const { paymentDetails } = req.body as PaymentDetailsPostBody<any>;
		if (!paymentDetails) {
			return res.status(400).json({ success: false, error: "Missing parameter `paymentDetails`" });
		}

		// Encrypt and store payment details
		const encryptedPaymentDetails = encrypt(JSON.stringify(paymentDetails));

		// Atomically commit to the db
		const batch = db.batch();
		batch.set(paymentDetailsRef, encryptedPaymentDetails);
		batch.update(userPublicDataRef, { hasBankDetails: true });
		await batch.commit();

		return res.status(200).json({ success: true });
	}

	if (req.method === "DELETE") {
		// Atomically commit to the db
		const batch = db.batch();
		batch.delete(paymentDetailsRef);
		batch.update(userPublicDataRef, { hasBankDetails: false });
		await batch.commit();

		return res.status(200).json({ success: true });
	}
}
