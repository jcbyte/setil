import { fetchApiJson } from "@/api/api";
import { db } from "@/firebase/firebase";
import { getUser } from "@/firebase/firestore/util";
import type { PublicUserData } from "@/types/firestore";
import { doc, DocumentReference, updateDoc } from "firebase/firestore";
import type { CloudinaryDetails } from "./types";

export async function importGoogleAvatar(): Promise<string> {
	const user = getUser();
	const res = await fetchApiJson<{ avatarUrl: string }>("/api/avatar/import", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${await user.getIdToken()}`,
		},
	});

	return res.avatarUrl;
}

export async function uploadAvatar(avatarFile: File): Promise<string> {
	const user = getUser();

	// Retrieve the signature to upload to cloudinary
	const res = await fetchApiJson<{ cloudinaryDetails: CloudinaryDetails }>("/api/avatar", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${await user.getIdToken()}`,
		},
	});
	const cldDetails = res.cloudinaryDetails;

	// Construct the file upload using the signature and received upload parameters
	const cldFormData = new FormData();
	cldFormData.append("api_key", cldDetails.apiKey);
	cldFormData.append("timestamp", String(cldDetails.timestamp));
	cldFormData.append("signature", cldDetails.signature);
	Object.entries(cldDetails.uploadParams).forEach(([key, value]) => cldFormData.append(key, value));
	cldFormData.append("file", avatarFile);

	// Upload the avatar file directly to cloudinary
	let avatarUrl: string | undefined;
	try {
		const cldRes = await fetch(`https://api.cloudinary.com/v1_1/${cldDetails.cloudName}/image/upload`, {
			method: "POST",
			body: cldFormData,
		});
		const cldData = await cldRes.json();

		if (!cldRes.ok) {
			throw new Error(cldData.error?.message || `Cloudinary upload failed with status ${cldRes.status}`);
		}

		avatarUrl = cldData.secure_url;
	} catch (e) {
		throw e instanceof Error ? e : new Error("Network request to Cloudinary failed");
	}
	if (!avatarUrl) throw new Error("Avatar URL was not returned from Cloudinary");

	// Update the firestore db with updated link
	const userPublicDataRef = doc(db, "users", user.uid, "public", "data") as DocumentReference<PublicUserData>;
	const uncachedAvatarUrl = `${avatarUrl}?v=${cldDetails.timestamp}`;
	await updateDoc(userPublicDataRef, { photoUrl: uncachedAvatarUrl });

	return uncachedAvatarUrl;
}

export async function removeAvatar() {
	const user = getUser();

	await fetchApiJson("/api/avatar", {
		method: "DELETE",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${await user.getIdToken()}`,
		},
	});
}
