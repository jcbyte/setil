import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import "./_init/firebaseAdmin.js";
import { encrypt } from "./_utils/crypt.js";

const db = getFirestore();
const auth = getAuth();

export default async function (req, res) {
	if (req.method !== "POST") {
		return res.status(405).json({ success: false, error: "Method Not Allowed" });
	}

	// Extract parameters
	const authHeader = req.headers.authorization;
	let jwt;
	if (authHeader && authHeader.startsWith("Bearer ")) {
		jwt = authHeader.split(" ")[1];
	}
	const { paymentDetails } = req.body;
	if (!jwt || !paymentDetails) {
		return res.status(400).json({ success: false, error: "Missing parameters" });
	}
	const paymentDetailsValue = JSON.parse(paymentDetails);

	// Get user who performed the request
	let user;
	try {
		user = await auth.verifyIdToken(jwt);
	} catch (e) {
		return res.status(401).json({ success: false, error: "Unauthorized" });
	}

	const paymentDetailsRef = db.doc(`/users/${user.uid}/private/paymentDetails`);
	const userPublicDataRef = db.doc(`/users/${user.uid}/public/data`);

	// Clear payment details
	if (paymentDetailsValue === null) {
		await userPublicDataRef.update({ hasBankDetails: false });
		await paymentDetailsRef.delete();
		return res.status(200).json({ success: true });
	}

	// Encrypt and store payment details
	const encryptedPaymentDetails = encrypt(paymentDetails);

	await paymentDetailsRef.set(encryptedPaymentDetails);
	await userPublicDataRef.update({ hasBankDetails: true });

	return res.status(200).json({ success: true });
}
