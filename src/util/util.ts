import type { BalanceStr } from "@/components/BalanceStrBadge.vue";
import type { Currency, GroupUserData, GroupUserStatus, Transaction } from "@/types/firestore";
import { formatCurrency } from "@shared/currency";

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
	return [
		...new Set([
			...(transaction.type === "expense" ? Object.keys(transaction.to) : [transaction.to]),
			transaction.from,
		]),
	].filter((userId) => users[userId].status !== "active");
}

export function getBalanceStr(
	balance: number,
	positiveGenerator: (formattedBal: string) => string,
	negativeGenerator: (formattedBal: string) => string,
	neutralGenerator: () => string,
	currency: Currency,
): BalanceStr {
	const formattedBal = formatCurrency(Math.abs(balance), currency);

	let status: "positive" | "negative" | "neutral";
	let str: string;

	if (balance === 0) {
		status = "neutral";
		str = neutralGenerator();
	} else if (balance > 0) {
		status = "positive";
		str = positiveGenerator(formattedBal);
	} else {
		status = "negative";
		str = negativeGenerator(formattedBal);
	}

	return { str, status };
}
