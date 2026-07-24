import type { GroupUserData, Transaction } from "@/firebase/types";

export function splitAmountEven(amount: number, people: string[]): Record<string, number> {
	if (people.length === 0) return {};

	const perPersonAmount = Math.floor(amount / people.length);
	const extraAmount = amount % people.length;

	return Object.fromEntries(people.map((person, index) => [person, perPersonAmount + (index < extraAmount ? 1 : 0)]));
}

export function splitAmountRatio(amount: number, people: Record<string, number>): Record<string, number> {
	if (Object.keys(people).length === 0) return {};

	const totalPercentage = Object.values(people).reduce((acc, percentage) => acc + percentage, 0);

	if (totalPercentage === 0) return {};

	const splitAmount = Object.fromEntries(
		Object.entries(people).map(([person, percentage]) => [person, Math.floor(amount * (percentage / totalPercentage))])
	);

	const extraAmount = amount - Object.values(splitAmount).reduce((acc, value) => acc + value, 0);
	splitAmount[Object.keys(people)[0]] += extraAmount;

	return splitAmount;
}

export function sumRecord(rec: Record<string, number>): number {
	return Object.values(rec).reduce((acc, value) => acc + value, 0);
}

export function getLeftUsersInTransaction(transaction: Transaction, users: Record<string, GroupUserData>) {
	return [...new Set([...Object.keys(transaction.to), transaction.from])].filter(
		(userId) => users[userId].status !== "active"
	);
}

export function getRouteParam(qp: string | string[]): string | null {
	return Array.isArray(qp) ? qp[0] : qp || null;
}
