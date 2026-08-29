import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
	CollectionReference,
	DocumentReference,
	getFirestore,
	type QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import {
	getMessaging,
	type BatchResponse,
	type FidMulticastMessage,
	type MulticastMessage,
} from "firebase-admin/messaging";
import type { SendGroupNotificationPostBody } from "../shared/types/api.js";
import type { GroupData, PushToken } from "./_types/firestore.js";
import { authenticateUser } from "./_utils/auth.js";
import { handlePreflight } from "./_utils/cors.js";

import "./_init/firebaseAdmin.js";
import { RenderedNotification, renderNotification, RenderNotificationError } from "./_utils/renderNotification.js";

const db = getFirestore();
const messaging = getMessaging();

const INVALID_TOKEN_CODES = new Set([
	"messaging/invalid-recipient",
	"messaging/invalid-registration-token",
	"messaging/registration-token-not-registered",
]);

async function cleanInvalidPushTokens(
	tokenDocs: QueryDocumentSnapshot<PushToken>[],
	multicastRes: BatchResponse,
): Promise<void> {
	const invalidTokenDocs = multicastRes.responses
		.map((res, idx) => {
			const isValid = res.error && INVALID_TOKEN_CODES.has(res.error.code);
			return isValid ? tokenDocs[idx] : undefined;
		})
		.filter((doc) => doc !== undefined);

	if (invalidTokenDocs.length === 0) return;

	const batch = db.batch();
	invalidTokenDocs.forEach((doc) => {
		// Enforce the push token hasn't been updated since
		batch.delete(doc.ref, { lastUpdateTime: doc.updateTime });
	});
	await batch.commit();
}

export default async function (req: VercelRequest, res: VercelResponse) {
	if (handlePreflight(req, res)) return;

	if (req.method !== "POST") {
		res.setHeader("Allow", "POST, OPTIONS");
		return res.status(405).json({ success: false, error: "Method Not Allowed" });
	}
	const user = await authenticateUser(req.headers.authorization, res);
	if (!user) return;

	const { groupId, notification } = req.body as Partial<SendGroupNotificationPostBody>;
	if (!groupId || !notification) {
		return res.status(400).json({ success: false, error: "Invalid request body" });
	}

	try {
		const groupRef = db.doc(`groups/${groupId}`) as DocumentReference<GroupData>;
		const groupSnap = await groupRef.get();
		const group = groupSnap.data();
		if (!group) return res.status(404).json({ success: false, error: "Group not found" });

		const activeUserSnaps = await groupRef.collection("users").where("status", "==", "active").get();
		const activeUserIds = new Set(activeUserSnaps.docs.map((doc) => doc.id));
		if (!activeUserIds.has(user.uid)) return res.status(403).json({ success: false, error: "Forbidden" });

		let renderedNotification: RenderedNotification;
		try {
			renderedNotification = await renderNotification(notification, groupId, group, user.uid);
		} catch (err) {
			if (err instanceof RenderNotificationError) {
				return res.status(err.code).json({ success: false, error: err.message });
			}
			return res.status(500).json({ success: false, error: "Error rendering notification message" });
		}

		const targetUsers = [...activeUserIds].filter((userId) => userId !== user.uid);
		const userTokenSnaps = await Promise.all(
			targetUsers.map((userId) => {
				const userPushTokensRef = db.collection(`users/${userId}/pushTokens`) as CollectionReference<PushToken>;
				return userPushTokensRef.get();
			}),
		);
		const tokenDocs = userTokenSnaps.flatMap((snap) => snap.docs);

		const webTokenDocs = tokenDocs.filter((doc) => doc.data().type === "web");
		if (webTokenDocs.length > 0) {
			const webMessage: FidMulticastMessage = {
				fids: webTokenDocs.map((doc) => doc.data().token),
				...renderedNotification.toWebMessage(),
			};
			const response = await messaging.sendEachForMulticast(webMessage);
			await cleanInvalidPushTokens(webTokenDocs, response);
		}

		const androidTokenDocs = tokenDocs.filter((doc) => doc.data().type === "android");
		if (androidTokenDocs.length > 0) {
			const androidMessage: MulticastMessage = {
				tokens: androidTokenDocs.map((doc) => doc.data().token),
				...renderedNotification.toAndroidMessage(),
			};
			const response = await messaging.sendEachForMulticast(androidMessage);
			await cleanInvalidPushTokens(androidTokenDocs, response);
		}

		const iosTokens = tokenDocs.filter((doc) => doc.data().type === "ios");
		if (iosTokens.length > 0) {
			console.warn(`${iosTokens.length} iOS push tokens received, but iOS notifications are not supported`);
		}

		return res.status(200).json({ success: true });
	} catch (error) {
		return res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
	}
}
