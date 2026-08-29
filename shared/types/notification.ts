export const DEFAULT_NOTIFICATION_CHANNEL = "general";

export interface JoinedGroup_Data {}

export interface LeftGroup_Data {}

export interface RemovedFromGroup_Data {
	userId: string;
}

export interface NewExpense_Data {
	transactionId: string;
}

export interface UpdatedExpense_Data {
	transactionId: string;
}

export interface RemovedExpense_Data {
	oldTransactionId: string;
	oldTitle: string;
	oldAmount: number;
}

export interface NewPayment_Data {
	transactionId: string;
}

export interface RemovedPayment_Data {
	oldTransactionId: string;
	oldFrom: string;
	oldTo: string;
	oldAmount: number;
}

export interface NotificationDetailMap {
	"joined-group": JoinedGroup_Data;
	"left-group": LeftGroup_Data;
	"removed-from-group": RemovedFromGroup_Data;
	"new-expense": NewExpense_Data;
	"updated-expense": UpdatedExpense_Data;
	"removed-expense": RemovedExpense_Data;
	"new-payment": NewPayment_Data;
	"removed-payment": RemovedPayment_Data;
}

export type NotificationDetail = {
	[K in keyof NotificationDetailMap]: { type: K } & NotificationDetailMap[K];
}[keyof NotificationDetailMap];
