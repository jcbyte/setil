import type { TransactionCategory } from "@/firebase/types";
import { FileText, Fuel, ReceiptText, Ticket, TramFront, Utensils, Wallet, type LucideProps } from "@lucide/vue";
import type { FunctionalComponent } from "vue";

export interface CategoryData {
	name: string;
	icon: FunctionalComponent<LucideProps, {}, any, {}>;
}

export const CategorySettings: Record<TransactionCategory, CategoryData> = {
	expense: { name: "Expense", icon: ReceiptText },
	food: { name: "Food", icon: Utensils },
	transport: { name: "Transport", icon: TramFront },
	fuel: { name: "Fuel", icon: Fuel },
	event: { name: "Event", icon: Ticket },
	bill: { name: "Bill", icon: FileText },
	payment: { name: "Payment", icon: Wallet },
};
