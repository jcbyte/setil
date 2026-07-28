export type NotificationType = "joined-group" | "new-transaction" | "new-payment";

export interface JoinedGroup_Data {
	userId: string;
}

export interface NewTransaction_Data {
	transactionId: string;
}

export interface NewPayment_Data {
	transactionId: string;
}

export interface NotificationDetailMap {
	"joined-group": JoinedGroup_Data;
	"new-transaction": NewTransaction_Data;
	"new-payment": NewPayment_Data;
}

export type NotificationDetail = {
	[K in keyof NotificationDetailMap]: { type: K } & NotificationDetailMap[K];
}[keyof NotificationDetailMap];
