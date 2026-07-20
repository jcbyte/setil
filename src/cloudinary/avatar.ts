import { getUser } from "@/firebase/firestore/util";
import type { AvatarUrl } from "./types";

export async function uploadAvatar(file: File): Promise<AvatarUrl | null> {
	const user = getUser();

	const b64Image = await new Promise<string>((r, rj) => {
		const reader = new FileReader();
		reader.readAsDataURL(file);
		reader.onload = () => {
			const res = reader.result;
			typeof res === "string" ? r(res) : rj(new Error("Failed to read file as Base64"));
		};
	});

	const res = await fetch("/api/upload-avatar", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${await user.getIdToken()}`,
		},
		body: JSON.stringify({ avatar: b64Image }),
	}).then((res) => res.json());

	try {
		const url = res.url as AvatarUrl;
		console.log(url);
		return url;
	} catch {
		return null;
	}
}
