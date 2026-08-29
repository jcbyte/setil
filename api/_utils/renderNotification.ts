import { DocumentReference, getFirestore } from "firebase-admin/firestore";
import { DEFAULT_NOTIFICATION_CHANNEL, NotificationDetail } from "../../shared/types/notification.js";
import { GroupData, GroupUserData, PublicUserData, Transaction } from "../_types/firestore.js";

import { BaseMessage } from "firebase-admin/messaging";
import { formatCurrency } from "../../shared/currency.js";
import "../_init/firebaseAdmin.js";

const db = getFirestore();

export class RenderedNotification {
	constructor(
		private title: string,
		private body: string,
		private route: string,
		private eventId: string,
	) {}

	public toWebMessage(): BaseMessage {
		return { data: { title: this.title, body: this.body, route: this.route, eventId: this.eventId } };
	}

	public toAndroidMessage(): BaseMessage {
		return {
			notification: { title: this.title, body: this.body },
			data: { route: this.route, eventId: this.eventId },
			android: { notification: { channelId: DEFAULT_NOTIFICATION_CHANNEL, tag: this.eventId } },
		};
	}
}

export class RenderNotificationError extends Error {
	constructor(
		public readonly code: number,
		message: string,
	) {
		super(message);
		this.name = "RenderNotificationError";
	}
}

async function getGroupUserName(groupId: string, userId: string): Promise<string | undefined> {
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

export async function renderNotification(
	notification: NotificationDetail,
	groupId: string,
	group: GroupData,
	sendingUser: string,
): Promise<RenderedNotification> {
	switch (notification.type) {
		case "joined-group":
			const name = await getGroupUserName(groupId, sendingUser);
			if (!name) throw new RenderNotificationError(404, "Group user not found");

			return new RenderedNotification(
				group.name,
				`${name} just joined the group!`,
				`/group/${groupId}`,
				`joined-group:${groupId}/${sendingUser}`,
			);

		case "new-expense":
		case "new-payment": {
			const transactionRef = db.doc(
				`groups/${groupId}/transactions/${notification.transactionId}`,
			) as DocumentReference<Transaction>;
			const transactionSnap = await transactionRef.get();
			const transaction = transactionSnap.data();
			if (!transaction) throw new RenderNotificationError(404, "Group transaction not found");

			const fromName = await getGroupUserName(groupId, transaction.from);
			if (!fromName) throw new RenderNotificationError(404, "Transaction user not found");

			if (notification.type === "new-expense") {
				if (transaction.type !== "expense") throw new RenderNotificationError(422, "Transaction is not an expense");

				const total = Object.values(transaction.to).reduce((sum, amount) => sum + amount, 0);

				let body: string;
				if (transaction.from === sendingUser) {
					body = `${fromName} added expense ${transaction.title} for ${formatCurrency(total, group.currency, true)}.`;
				} else {
					const sendingName = await getGroupUserName(groupId, sendingUser);
					if (!sendingName) throw new RenderNotificationError(404, "Notification sender user not found");
					body = `${sendingName} added expense ${transaction.title} for ${formatCurrency(total, group.currency, true)}, paid by ${fromName}.`;
				}

				return new RenderedNotification(
					group.name,
					body,
					`/group/${groupId}`,
					`new-expense:${groupId}/${notification.transactionId}`,
				);
			} else {
				if (transaction.type !== "payment") throw new RenderNotificationError(422, "Transaction is not a payment");

				const toName = await getGroupUserName(groupId, transaction.to);
				if (!toName) throw new RenderNotificationError(404, "Payment transaction 'to' user not found");

				return new RenderedNotification(
					group.name,
					`${fromName} paid ${toName} ${formatCurrency(transaction.amount, group.currency, true)}.`,
					`/group/${groupId}`,
					`new-payment:${groupId}/${notification.transactionId}`,
				);
			}
		}
		default:
			throw new RenderNotificationError(400, "Unknown notification type");
	}
}
