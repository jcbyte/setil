export type Currency = "gbp" | "usd" | "eur" | "pln";

export type TransactionCategory = "expense" | "food" | "transport" | "fuel" | "event" | "bill";

export interface UserData {
	groups: string[];
}

export interface PublicUserData {
	name: string;
	photoUrl?: string;
	hasBankDetails: boolean;
}

export interface GroupData<TTimestamp> {
	name: string;
	description: string | null;
	currency: Currency;
	owner: string;
	lastUpdate: TTimestamp;
}

export type GroupUserStatus = "active" | "left" | "history";

export interface GroupUserData<TTimestamp> {
	nickname?: string;
	status: GroupUserStatus;
	balance: number;
	lastUpdate: TTimestamp;
}

interface BaseTransaction<TTimestamp> {
	from: string;
	date: TTimestamp;
}

export interface ExpenseTransaction<TTimestamp> extends BaseTransaction<TTimestamp> {
	title: string;
	to: Record<string, number>;
	category: TransactionCategory;
}

export interface PaymentTransaction<TTimestamp> extends BaseTransaction<TTimestamp> {
	to: string;
	amount: number;
}

export type Transaction<TTimestamp> =
	({ type: "expense" } & ExpenseTransaction<TTimestamp>) | ({ type: "payment" } & PaymentTransaction<TTimestamp>);

export interface Invite<TTimestamp> {
	expiry: TTimestamp;
}

export type DeviceType = "web" | "android" | "ios";

export interface PushToken<TTimestamp> {
	token: string;
	type: DeviceType;
	updatedAt: TTimestamp;
}
