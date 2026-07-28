import type { NotificationDetail } from "./notification.js";

export interface PaymentDetailsPostBody<PD> {
	paymentDetails: PD;
}

export interface SendGroupNotificationPostBody {
	groupId: string;
	notification: NotificationDetail;
}
