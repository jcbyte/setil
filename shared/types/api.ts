import type { NotificationDetail } from "./notification.js";

export interface SendGroupNotificationPostBody {
	groupId: string;
	notification: NotificationDetail;
}

// todo typing for other endpoints
