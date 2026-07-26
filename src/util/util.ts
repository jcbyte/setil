import type { GroupUserData, GroupUserStatus, Transaction } from "@/firebase/types";

export function getRouteParam(qp: string | string[]): string | null {
	return Array.isArray(qp) ? qp[0] : qp || null;
}

export function sumRecordValues(rec: Record<string, number>): number {
	return Object.values(rec).reduce((acc, value) => acc + value, 0);
}

export function getStatusUsers<T extends { status: GroupUserStatus }>(
	users: Record<string, T>,
	valid: Set<GroupUserStatus>,
): Record<string, T> {
	return Object.fromEntries(Object.entries(users).filter(([, user]) => valid.has(user.status)));
}

export function getLeftUsersInTransaction(transaction: Transaction, users: Record<string, GroupUserData>) {
	return [...new Set([...Object.keys(transaction.to), transaction.from])].filter(
		(userId) => users[userId].status !== "active",
	);
}
