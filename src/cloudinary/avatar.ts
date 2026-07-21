import { getUser } from "@/firebase/firestore/util";
import type { AvatarUrl } from "./types";

export async function uploadAvatar(b64Img: string): Promise<AvatarUrl> {
	const user = getUser();

	const res = await fetch("/api/avatar", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${await user.getIdToken()}`,
		},
		body: JSON.stringify({ avatar: b64Img }),
	}).then((res) => res.json());

	const url = res.url as AvatarUrl;
	return url;
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
