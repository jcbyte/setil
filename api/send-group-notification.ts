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
import { formatCurrency } from "../shared/currency.js";
import type { SendGroupNotificationPostBody } from "../shared/types/api.js";
import { DEFAULT_NOTIFICATION_CHANNEL } from "../shared/types/notification.js";
import type { GroupData, GroupUserData, PublicUserData, PushToken, Transaction } from "./_types/firestore.js";
import { authenticateUser } from "./_utils/auth.js";
import { handlePreflight } from "./_utils/cors.js";

import "./_init/firebaseAdmin.js";

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

async function getGroupUserName(groupId: string, userId: string) {
	const memberRef = db.doc(`groups/${groupId}/users/${userId}`) as DocumentReference<GroupUserData>;
	const memberSnap = await memberRef.get();
	const memberData = memberSnap.data();
	if (memberData?.nickname) return memberData.nickname;

	const userPublicRef = db.doc(`users/${userId}/public/data`) as DocumentReference<PublicUserData>;
	const userPublicSnap = await userPublicRef.get();
	const userPublicData = userPublicSnap.data();
	if (userPublicData?.name) return userPublicData.name;

	return;
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

		let body: string;
		let route: string;
		let eventId: string;
		switch (notification.type) {
			case "joined-group":
				const name = await getGroupUserName(groupId, notification.userId);
				if (!name) return res.status(404).json({ success: false, error: "Group user not found" });

				body = `${name} just joined the group!`;
				route = `/group/${groupId}`;
				eventId = `joined-group:${groupId}/${notification.userId}`;

				break;

			case "new-transaction":
			case "new-payment": {
				const transactionRef = db.doc(
					`groups/${groupId}/transactions/${notification.transactionId}`,
				) as DocumentReference<Transaction>;
				const transactionSnap = await transactionRef.get();
				const transaction = transactionSnap.data();
				if (!transaction) return res.status(404).json({ success: false, error: "Group transaction not found" });

				const fromName = await getGroupUserName(groupId, transaction.from);
				if (!fromName) return res.status(404).json({ success: false, error: "Transaction user not found" });

				if (notification.type === "new-transaction") {
					if (transaction.type !== "expense")
						return res.status(422).json({ success: false, error: "Transaction is not an expense" });

					const total = Object.values(transaction.to).reduce((sum, amount) => sum + amount, 0);
					body = `${fromName} added expense ${transaction.title} for ${formatCurrency(total, group.currency, true)}.`;
					route = `/group/${groupId}`;
					eventId = `new-transaction:${groupId}/${notification.transactionId}`;
				} else {
					if (transaction.type !== "payment")
						return res.status(422).json({ success: false, error: "Transaction is not a payment" });

					const toName = await getGroupUserName(groupId, transaction.to);
					body = `${fromName} paid ${toName} ${formatCurrency(transaction.amount, group.currency, true)}.`;
					route = `/group/${groupId}`;
					eventId = `new-payment:${groupId}/${notification.transactionId}`;
				}

				break;
			}
			default:
				return res.status(400).json({ success: false, error: "Unknown notification type" });
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
				data: { title: group.name, body, route, eventId },
			};
			const response = await messaging.sendEachForMulticast(webMessage);
			await cleanInvalidPushTokens(webTokenDocs, response);
		}

		const androidTokenDocs = tokenDocs.filter((doc) => doc.data().type === "android");
		if (androidTokenDocs.length > 0) {
			const androidMessage: MulticastMessage = {
				tokens: androidTokenDocs.map((doc) => doc.data().token),
				notification: { title: group.name, body },
				data: { route, eventId },
				android: { notification: { channelId: DEFAULT_NOTIFICATION_CHANNEL, tag: eventId } },
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
