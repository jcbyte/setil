import type { GroupUserData, Transaction } from "@/firebase/types";

export function getRouteParam(qp: string | string[]): string | null {
	return Array.isArray(qp) ? qp[0] : qp || null;
}

export function sumRecordValues(rec: Record<string, number>): number {
	return Object.values(rec).reduce((acc, value) => acc + value, 0);
}

export function getNonHistoricalUsers<T extends { status: string }>(users: Record<string, T>): Record<string, T> {
	return Object.fromEntries(Object.entries(users).filter(([, user]) => user.status !== "history"));
}

export function getLeftUsersInTransaction(transaction: Transaction, users: Record<string, GroupUserData>) {
	return [...new Set([...Object.keys(transaction.to), transaction.from])].filter(
		(userId) => users[userId].status !== "active",
	);
}
