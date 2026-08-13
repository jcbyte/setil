import { VercelRequest, VercelResponse } from "@vercel/node";
import { v2 as cloudinary } from "cloudinary";
import { DocumentReference, getFirestore } from "firebase-admin/firestore";
import { PublicUserData } from "../_types/firestore.js";
import { authenticateUser } from "../_utils/auth.js";
import { handlePreflight } from "../_utils/cors.js";
import { avatarApiOptions, getAvatarPublicId } from "./_shared.js";

import "../_init/cloudinary.js";
import "../_init/firebaseAdmin.js";

const db = getFirestore();

export default async function (req: VercelRequest, res: VercelResponse) {
	if (handlePreflight(req, res)) return;

	if (req.method !== "POST") {
		res.setHeader("Allow", "POST, OPTIONS");
		return res.status(405).json({ success: false, error: "Method Not Allowed" });
	}

	const user = await authenticateUser(req.headers.authorization, res);
	if (!user) return;

	if (req.method === "POST") {
		const googleSourceUrl = user.picture;
		if (!googleSourceUrl) {
			return res.status(422).json({ success: false, error: "User does not have a profile image to import" });
		}

		const uploadResult = await cloudinary.uploader.upload(googleSourceUrl, {
			public_id: getAvatarPublicId(user.uid),
			...avatarApiOptions,
		});

		// Update photoUrl field
		const userPublicDataRef = db.doc(`/users/${user.uid}/public/data`) as DocumentReference<PublicUserData>;
		await userPublicDataRef.update({ photoUrl: uploadResult.secure_url });

		return res.status(200).json({ success: true });
	}
}
