export type Currency = "gbp" | "usd" | "eur" | "pln";

export type TransactionCategory = "expense" | "food" | "transport" | "fuel" | "event" | "bill" | "payment";

export interface UserData {
	groups: string[];
	fids: string[];
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

export interface Transaction<TTimestamp> {
	title: string;
	from: string;
	to: Record<string, number>;
	date: TTimestamp;
	category: TransactionCategory;
}

export interface Invite<TTimestamp> {
	expiry: TTimestamp;
}
