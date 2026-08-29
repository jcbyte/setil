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

async function getTransaction(groupId: string, transactionId: string): Promise<Transaction | undefined> {
	const transactionRef = db.doc(`groups/${groupId}/transactions/${transactionId}`) as DocumentReference<Transaction>;
	const transactionSnap = await transactionRef.get();
	return transactionSnap.data();
}

export async function renderNotification(
	notification: NotificationDetail,
	groupId: string,
	group: GroupData,
	sendingUser: string,
): Promise<RenderedNotification> {
	switch (notification.type) {
		case "joined-group":
		case "left-group": {
			const name = await getGroupUserName(groupId, sendingUser);
			if (!name) throw new RenderNotificationError(404, "Sending user not found");

			return new RenderedNotification(
				group.name,
				notification.type === "joined-group" ? `${name} just joined the group!` : `${name} left the group.`,
				`/group/${groupId}`,
				`${notification.type}:${groupId}/${sendingUser}`,
			);
		}

		case "removed-from-group": {
			const name = await getGroupUserName(groupId, notification.userId);
			if (!name) throw new RenderNotificationError(404, "Group user not found");

			return new RenderedNotification(
				group.name,
				`${name} was removed from the group.`,
				`/group/${groupId}`,
				`${notification.type}:${groupId}/${notification.userId}`,
			);
		}

		case "new-expense": {
			const transaction = await getTransaction(groupId, notification.transactionId);
			if (!transaction) throw new RenderNotificationError(404, "Transaction not found");

			if (transaction.type !== "expense") throw new RenderNotificationError(422, "Transaction is not an expense");

			const fromName = await getGroupUserName(groupId, transaction.from);
			if (!fromName) throw new RenderNotificationError(404, "Transaction 'from' user not found");

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
				`${notification.type}:${groupId}/${notification.transactionId}`,
			);
		}

		case "updated-expense": {
			const transaction = await getTransaction(groupId, notification.transactionId);
			if (!transaction) throw new RenderNotificationError(404, "Transaction not found");

			if (transaction.type !== "expense") throw new RenderNotificationError(422, "Transaction is not an expense");

			const sendingName = await getGroupUserName(groupId, sendingUser);
			if (!sendingName) throw new RenderNotificationError(404, "Notification sender user not found");

			return new RenderedNotification(
				group.name,
				`${sendingName} updated expense ${transaction.title}.`,
				`/group/${groupId}`,
				`${notification.type}:${groupId}/${notification.transactionId}`,
			);
		}

		case "removed-expense": {
			const sendingName = await getGroupUserName(groupId, sendingUser);
			if (!sendingName) throw new RenderNotificationError(404, "Notification sender user not found");

			return new RenderedNotification(
				group.name,
				`${sendingName} removed expense ${notification.oldTitle} for ${formatCurrency(notification.oldAmount, group.currency, true)}.`,
				`/group/${groupId}`,
				`${notification.type}:${groupId}/${notification.oldTransactionId}`,
			);
		}

		case "new-payment": {
			const transaction = await getTransaction(groupId, notification.transactionId);
			if (!transaction) throw new RenderNotificationError(404, "Transaction not found");

			if (transaction.type !== "payment") throw new RenderNotificationError(422, "Transaction is not a payment");

			const fromName = await getGroupUserName(groupId, transaction.from);
			if (!fromName) throw new RenderNotificationError(404, "Transaction 'from' user not found");

			const toName = await getGroupUserName(groupId, transaction.to);
			if (!toName) throw new RenderNotificationError(404, "Payment transaction 'to' user not found");

			return new RenderedNotification(
				group.name,
				`${fromName} paid ${toName} ${formatCurrency(transaction.amount, group.currency, true)}.`,
				`/group/${groupId}`,
				`${notification.type}:${groupId}/${notification.transactionId}`,
			);
		}

		case "removed-payment": {
			const toName = await getGroupUserName(groupId, notification.oldTo);
			if (!toName) throw new RenderNotificationError(404, "Payment 'to' user not found");

			const fromName = await getGroupUserName(groupId, notification.oldFrom);
			if (!fromName) throw new RenderNotificationError(404, "Payment 'from' user not found");

			let body: string;
			if (notification.oldFrom === sendingUser) {
				body = `${fromName} removed their payment of ${formatCurrency(notification.oldAmount, group.currency, true)} to ${toName}.`;
			} else if (notification.oldTo === sendingUser) {
				body = `${toName} removed their payment of ${formatCurrency(notification.oldAmount, group.currency, true)} from ${fromName}.`;
			} else {
				const sendingName = await getGroupUserName(groupId, sendingUser);
				if (!sendingName) throw new RenderNotificationError(404, "Notification sender user not found");
				body = `${sendingName} removed ${fromName}'s payment of ${formatCurrency(notification.oldAmount, group.currency, true)} to ${toName}.`;
			}

			return new RenderedNotification(
				group.name,
				body,
				`/group/${groupId}`,
				`${notification.type}:${groupId}/${notification.oldTransactionId}`,
			);
		}

		default:
			throw new RenderNotificationError(400, "Unknown notification type");
	}
}
