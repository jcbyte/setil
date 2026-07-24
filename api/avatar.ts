import { VercelRequest, VercelResponse } from "@vercel/node";
import { v2 as cloudinary, SignApiOptions } from "cloudinary";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

import "./_init/cloudinary.js";
import "./_init/firebaseAdmin.js";
import { authenticateUser } from "./_utils/auth.js";

const db = getFirestore();

export default async function (req: VercelRequest, res: VercelResponse) {
	if (req.method !== "POST" && req.method !== "DELETE") {
		return res.status(405).json({ success: false, error: "Method Not Allowed" });
	}

	const user = await authenticateUser(req.headers.authorization, res);
	if (!user) return;

	const avatarPublicId = `users/${user.uid}/avatar`;

	if (req.method === "POST") {
		// Return a signature for the client to upload the file directly
		const timestamp = Math.round(new Date().getTime() / 1000);

		const toSignParams: SignApiOptions = {
			timestamp,
			public_id: avatarPublicId,
			overwrite: true,
			transformation: "c_fill,h_150,w_150/r_max",
		};
		const signature = cloudinary.utils.api_sign_request(toSignParams, process.env.CLOUDINARY_API_SECRET!);

		return res.status(200).json({
			success: true,
			cloudinaryDetails: {
				signature,
				timestamp,
				cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
				apiKey: process.env.CLOUDINARY_API_KEY!,
				uploadParams: toSignParams,
			},
		});
	}

	if (req.method === "DELETE") {
		// Remove the avatar from cloudinary
		try {
			await cloudinary.uploader.destroy(avatarPublicId);
			// If this fails it should be okay, as we may not have previously uploaded an avatar i.e. still using Initial Google avatar
		} catch {}

		// Remove photoUrl field
		const userPublicDataRef = db.doc(`/users/${user.uid}/public/data`); // as DocumentReference<PublicUserData>;
		await userPublicDataRef.update({ photoUrl: FieldValue.delete() });

		return res.status(200).json({ success: true });
	}
}
