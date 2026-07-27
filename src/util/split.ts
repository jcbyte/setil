export interface SimpleTransaction {
	from: string;
	to: string;
	amount: number;
}

export function resolveGroupDebts(debts: Record<string, number>): SimpleTransaction[] {
	const values = Object.values(debts);
	if (values.some((v) => !Number.isSafeInteger(v))) throw new Error("Group balances contain invalid amounts");
	const total = values.reduce((sum, balance) => sum + balance, 0);
	if (total !== 0) throw new Error(`Group debts are inconsistent: total balance is ${total}`);

	const balances = { ...debts };

	// Separate users globally in credit/debt
	const { creditors, debtors } = Object.entries(balances).reduce<{ creditors: string[]; debtors: string[] }>(
		({ creditors, debtors }, [userId, resolvedDebt]) => {
			if (resolvedDebt > 0) creditors.push(userId);
			else if (resolvedDebt < 0) debtors.push(userId);
			return { creditors, debtors };
		},
		{ creditors: [], debtors: [] },
	);

	// Sort creditors and debtors for heuristics, highest credit/debt first
	creditors.sort((a, b) => balances[b] - balances[a]);
	debtors.sort((a, b) => -balances[b] - -balances[a]);

	const newDebts: { from: string; to: string; amount: number }[] = [];

	// Match debtors and creditors to minimise transactions
	let currentCreditor = 0;
	let currentDebtor = 0;

	while (currentCreditor < creditors.length && currentDebtor < debtors.length) {
		const creditor = creditors[currentCreditor];
		const debtor = debtors[currentDebtor];

		// Determine the max amount that can be settled between these two users
		const amount = Math.min(Math.abs(balances[creditor]), Math.abs(balances[debtor]));

		// Add this transaction
		newDebts.push({ from: debtor, to: creditor, amount });

		// Subtract remaining debts of these users
		balances[creditor] -= amount;
		balances[debtor] += amount;

		// If this creditor/debtor is in ballance then move to the next one
		if (balances[creditor] === 0) currentCreditor++;
		if (balances[debtor] === 0) currentDebtor++;
	}

	return newDebts;
}

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
		Object.entries(people).map(([person, percentage]) => [person, Math.floor(amount * (percentage / totalPercentage))]),
	);

	const extraAmount = amount - Object.values(splitAmount).reduce((acc, value) => acc + value, 0);
	splitAmount[Object.keys(people)[0]] += extraAmount;

	return splitAmount;
}
