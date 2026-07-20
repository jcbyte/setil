import { getAuth } from "firebase-admin/auth";
import "./firebaseAdmin.js";
import { v2 as cloudinary } from "cloudinary";
import "./cloudinary.js";

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
	const { avatar } = req.body;
	if (!jwt || !avatar) {
		return res.status(400).json({ success: false, error: "Missing parameters" });
	}

	// Get user who performed the request
	let user;
	try {
		user = await auth.verifyIdToken(jwt);
	} catch (e) {
		return res.status(401).json({ success: false, error: "Unauthorized" });
	}

	// Upload avatar to cloudinary
	const cldRes = await cloudinary.uploader.upload(avatar, {
		public_id: `avatars/${user.uid}/profile.jpg`,
		overwrite: true,
		// todo which of these transformations are needed?
		transformation: [{ width: 150, height: 150, crop: "crop" }, { radius: "max" }],
	});

	return res.status(200).json({ success: true, url: cldRes.secure_url });
}
