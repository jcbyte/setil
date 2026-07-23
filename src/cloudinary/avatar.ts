import { db } from "@/firebase/firebase";
import { getUser } from "@/firebase/firestore/util";
import type { PublicUserData } from "@/firebase/types";
import { doc, DocumentReference, updateDoc } from "firebase/firestore";
import type { CloudinaryDetails } from "./types";

export async function uploadAvatar(avatarFile: File): Promise<string> {
	const user = getUser();

	// Retrieve the signature to upload to cloudinary
	const res = await fetch("/api/avatar", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${await user.getIdToken()}`,
		},
	}).then((res) => res.json());
	const cldDetails = res.cloudinaryDetails as CloudinaryDetails;

	// Construct the file upload using the signature and received upload parameters
	const cldFormData = new FormData();
	cldFormData.append("api_key", cldDetails.apiKey);
	cldFormData.append("timestamp", String(cldDetails.timestamp));
	cldFormData.append("signature", cldDetails.signature);
	Object.entries(cldDetails.uploadParams).forEach(([key, value]) => cldFormData.append(key, value));
	cldFormData.append("file", avatarFile);

	// Upload the avatar file directly to cloudinary
	const cldResponse = await fetch(`https://api.cloudinary.com/v1_1/${cldDetails.cloudName}/image/upload`, {
		method: "POST",
		body: cldFormData,
	}).then((res) => res.json());
	const avatarUrl = cldResponse.secure_url as string;

	// Update the firestore db with updated link
	const userPublicDataRef = doc(db, "users", user.uid, "public", "data") as DocumentReference<PublicUserData>;
	const uncachedAvatarUrl = `${avatarUrl}?v=${cldDetails.timestamp}`;
	await updateDoc(userPublicDataRef, { photoUrl: uncachedAvatarUrl });

	return uncachedAvatarUrl;
}

export async function removeAvatar() {
	const user = getUser();

	await fetch("/api/avatar", {
		method: "DELETE",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${await user.getIdToken()}`,
		},
	});
}
