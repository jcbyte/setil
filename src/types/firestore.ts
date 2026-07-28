import type * as Shared from "@shared/types/firestore";
import type { Timestamp } from "firebase/firestore";

export * from "@shared/types/firestore";

// Bind the generic type specifically for the Admin SDK
export type GroupData = Shared.GroupData<Timestamp>;
export type GroupUserData = Shared.GroupUserData<Timestamp>;
export type Transaction = Shared.Transaction<Timestamp>;
export type Invite = Shared.Invite<Timestamp>;
