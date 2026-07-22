import { VercelRequest, VercelResponse } from "@vercel/node";
import { v2 as cloudinary } from "cloudinary";
import { DecodedIdToken, getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import "./_init/cloudinary.js";
import "./_init/firebaseAdmin.js";

const db = getFirestore();
const auth = getAuth();

export default async function (req: VercelRequest, res: VercelResponse) {
	if (req.method !== "POST" && req.method !== "DELETE") {
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

	const userPublicDataRef = db.doc(`/users/${user.uid}/public/data`);
	const avatarPublicId = `users/${user.uid}/avatar`;

	if (req.method === "POST") {
		const { avatar } = req.body;
		if (!avatar) {
			return res.status(400).json({ success: false, error: "Missing parameter `avatar`" });
		}

		// Upload avatar to cloudinary
		const cldRes = await cloudinary.uploader.upload(avatar, {
			public_id: avatarPublicId,
			overwrite: true,
			transformation: [{ width: 150, height: 150, crop: "fill" }, { radius: "max" }],
		});
		const url = cldRes.secure_url;

		// Update our public photoUrl here
		await userPublicDataRef.update({ photoUrl: url });

		return res.status(200).json({ success: true, url });
	}

	if (req.method === "DELETE") {
		// Remove the avatar from cloudinary
		try {
			await cloudinary.uploader.destroy(avatarPublicId);
			// If this fails it should be okay, as we may not have previously uploaded an avatar i.e. still using Initial Google avatar
		} catch {}

		// Remove photoUrl field
		await userPublicDataRef.update({ photoUrl: FieldValue.delete() });

		return res.status(200).json({ success: true });
	}
}
