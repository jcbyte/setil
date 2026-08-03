import type { VercelRequest, VercelResponse } from "@vercel/node";
import { DocumentReference, getFirestore } from "firebase-admin/firestore";
import { FidMulticastMessage, getMessaging } from "firebase-admin/messaging";
import { formatCurrency } from "../shared/currency.js";
import type { SendGroupNotificationPostBody } from "../shared/types/api.js";
import "./_init/firebaseAdmin.js";
import type { GroupData, GroupUserData, PublicUserData, Transaction } from "./_types/firestore.js";
import { authenticateUser } from "./_utils/auth.js";

const db = getFirestore();
const messaging = getMessaging();

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
	if (req.method !== "POST") {
		res.setHeader("Allow", "POST");
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
		switch (notification.type) {
			case "joined-group":
				const name = await getGroupUserName(groupId, notification.userId);
				if (!name) return res.status(404).json({ success: false, error: "Group user not found" });

				body = `${name} just joined the group!`;
				route = `/group/${groupId}`;

				break;

			case "new-transaction":
			case "new-payment": {
				const transactionRef = db.doc(
					`groups/${groupId}/transactions/${notification.transactionId}`,
				) as DocumentReference<Transaction>;
				const transactionSnap = await transactionRef.get();
				const transaction = transactionSnap.data();
				if (!transaction) return res.status(404).json({ success: false, error: "Group transaction not found" });

				const total = Object.values(transaction.to).reduce((sum, amount) => sum + amount, 0);

				const fromName = await getGroupUserName(groupId, transaction.from);
				if (!fromName) return res.status(404).json({ success: false, error: "Transaction user not found" });

				if (notification.type === "new-transaction") {
					body = `${fromName} added expense ${transaction.title} for ${formatCurrency(total, group.currency, true)}.`;
					route = `/group/${groupId}?tab=activity`;
					break;
				}

				const toUsers = Object.keys(transaction.to);
				if (toUsers.length !== 1)
					return res.status(400).json({ success: false, error: "Transaction is not a payment" });
				const toName = await getGroupUserName(groupId, toUsers[0]!);
				if (!toName) return res.status(404).json({ success: false, error: "Payment user not found" });

				body = `${fromName} paid ${toName} ${formatCurrency(total, group.currency, true)}.`;
				route = `/group/${groupId}?tab=summary`;
				break;
			}
			default:
				return res.status(400).json({ success: false, error: "Unknown notification type" });
		}

		const userRefs = [...activeUserIds].map((userId) => db.doc(`users/${userId}`));
		const userSnaps = await db.getAll(...userRefs);
		const fids = userSnaps.flatMap((snap) => snap.get("fids") ?? []);

		if (fids.length > 0) {
			const message: FidMulticastMessage = { fids, data: { title: group.name, body, route } };
			await messaging.sendEachForMulticast(message);
		}

		return res.status(200).json({ success: true });
	} catch (error) {
		return res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
	}
}
