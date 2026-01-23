import type { Timestamp } from "firebase/firestore";

export type Currency = "gbp" | "usd" | "eur" | "pln";

export type TransactionCategory = "expense" | "food" | "transport" | "fuel" | "event" | "bill" | "payment";

export interface UserData {
	groups: string[];
	fcmTokens: string[];
}

export interface PublicUserData {
	name: string;
	photoURL: string | null;
	hasBankDetails: boolean;
}

export interface GroupData {
	name: string;
	description: string | null;
	currency: Currency;
	owner: string;
	lastUpdate: Timestamp;
}

export interface GroupUserData {
	name: string; // todo should be nickname
	status: "active" | "left" | "history";
	balance: number;
	lastUpdate: Timestamp;
}

export interface Transaction {
	title: string;
	from: string;
	to: Record<string, number>;
	date: Timestamp;
	category: TransactionCategory;
}

export interface Invite {
	expiry: Timestamp;
}
