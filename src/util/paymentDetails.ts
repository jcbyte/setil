export type BankingSystem = "UK" | "US" | "SEPA" | "SWIFT";

export interface BankingSystemData {
	name: string;
}

export const BankingSystemSettings: Record<BankingSystem, BankingSystemData> = {
	UK: { name: "UK (Sort Code & Account Number)" },
	US: { name: "US (Routing & Account Number)" },
	SEPA: { name: "SEPA (IBAN & BIC)" },
	SWIFT: { name: "SWIFT (International)" },
};

export interface UK_PaymentDetails {
	name: string;
	sortCode: string;
	accountNumber: string;
}

export interface US_PaymentDetails {
	name: string;
	routingNumber: string;
	accountNumber: string;
}

export interface SEPA_PaymentDetails {
	name: string;
	IBAN: string;
	BIC: string | null;
}

export interface SWIFT_PaymentDetails {
	name: string;
	SWIFT: string;
	IBAN: string;
	bankName: string | null;
	bankAddress: string | null;
}

export interface PaymentDetailMap {
	UK: UK_PaymentDetails;
	US: US_PaymentDetails;
	SEPA: SEPA_PaymentDetails;
	SWIFT: SWIFT_PaymentDetails;
}

export type PaymentDetails = {
	[K in keyof PaymentDetailMap]: { type: K } & PaymentDetailMap[K];
}[keyof PaymentDetailMap];
