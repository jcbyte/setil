import type { BalanceStr } from "@/components/BalanceStrBadge.vue";
import type { Currency } from "@/firebase/types";

export interface CurrencyData {
	name: string;
	symbol: string;
	symbolAfter?: boolean;
	separator?: string;
	decimals: number;
}

export const CurrencySettings: Record<Currency, CurrencyData> = {
	gbp: { name: "Pound Sterling", symbol: "£", decimals: 2 },
	usd: { name: "US Dollar", symbol: "$", decimals: 2 },
	eur: { name: "Euro", symbol: "€", decimals: 2 },
	pln: { name: "Polish Zloty", symbol: " zł", symbolAfter: true, separator: ",", decimals: 2 },
};

export function formatCurrency(amount: number, currency: Currency, firebaseAmount: boolean = true): string {
	const currencySetting = CurrencySettings[currency];

	const realAmount = firebaseAmount ? fromFirestoreAmount(amount, currency) : amount;
	const negative = realAmount < 0;
	let formattedAmount = Math.abs(realAmount).toFixed(currencySetting.decimals);
	if (currencySetting.separator) formattedAmount = formattedAmount.replace(".", currencySetting.separator);

	return (
		(negative ? "-" : "") +
		(!currencySetting.symbolAfter ? currencySetting.symbol : "") +
		formattedAmount +
		(currencySetting.symbolAfter ? currencySetting.symbol : "")
	);
}

export function fromFirestoreAmount(amount: number, currency: Currency) {
	const decimalMultiplier = Math.pow(10, CurrencySettings[currency].decimals);
	return Math.floor(amount) / decimalMultiplier;
}

export function toFirestoreAmount(amount: number, currency: Currency): number {
	const decimalMultiplier = Math.pow(10, CurrencySettings[currency].decimals);
	return Math.round(amount * decimalMultiplier);
}

export function getBalanceStr(
	balance: number,
	currency: Currency,
	positiveGenerator: (formattedBal: string) => string,
	negativeGenerator: (formattedBal: string) => string,
	neutralGenerator: () => string
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
