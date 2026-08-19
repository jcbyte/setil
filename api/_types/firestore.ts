import type { Timestamp } from "firebase-admin/firestore";
import type * as Shared from "../../shared/types/firestore.js";

export * from "../../shared/types/firestore.js";

// Bind the generic type specifically for the Admin SDK
export type GroupData = Shared.GroupData<Timestamp>;
export type GroupUserData = Shared.GroupUserData<Timestamp>;
export type PaymentTransaction = Shared.PaymentTransaction<Timestamp>;
export type ExpenseTransaction = Shared.ExpenseTransaction<Timestamp>;
export type Transaction = Shared.Transaction<Timestamp>;
export type Invite = Shared.Invite<Timestamp>;
export type PushToken = Shared.PushToken<Timestamp>;
