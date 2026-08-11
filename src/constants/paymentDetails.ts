import type { BankingSystem } from "@/types/paymentDetails";

export interface BankingSystemData {
	name: string;
}

export const BankingSystemSettings: Record<BankingSystem, BankingSystemData> = {
	UK: { name: "UK (Sort Code & Account Number)" },
	US: { name: "US (Routing & Account Number)" },
	SEPA: { name: "SEPA (IBAN & BIC)" },
	SWIFT: { name: "SWIFT (International)" },
};
