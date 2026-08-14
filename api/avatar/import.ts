import { VercelRequest, VercelResponse } from "@vercel/node";
import { v2 as cloudinary } from "cloudinary";
import { authenticateUser } from "../_utils/auth.js";
import { handlePreflight } from "../_utils/cors.js";
import { avatarApiOptions, getAvatarPublicId } from "./_shared.js";

import "../_init/cloudinary.js";

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

		return res.status(200).json({ success: true, avatarUrl: uploadResult.secure_url });
	}
}
