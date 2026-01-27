import { sumRecord } from "@/util/util";
import {
	addDoc,
	collection,
	doc,
	DocumentReference,
	getDoc,
	increment,
	WriteBatch,
	writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Transaction } from "../types";
import { updateGroupUpdateTime } from "./group";
import { updateLeftUsersStatus } from "./user";

/**
 * Add firebase updates to a batch to update users balances in a group with the given from and to.
 * @param groupRef Document of the group to update balances on
 * @param batch WriteBatch to add the transactions to.
 * @param from the user who bought the transaction.
 * @param to  the users receiving teh transaction, with the value.
 */
function updateGroupBalances(groupRef: DocumentReference, batch: WriteBatch, from: string, to: Record<string, number>) {
	// Ignore entries where the receiver is the sender
	const otherTo = Object.fromEntries(Object.entries(to).filter(([userId]) => userId !== from));

	// Add the total credit onto the from user
	const fromUserRef = doc(groupRef, "users", from);
	batch.update(fromUserRef, { [`balance`]: increment(sumRecord(otherTo)) });

	// Update each receiver with their new balances
	Object.entries(otherTo).forEach(([toUser, toAmount]) => {
		// Add the given debt to the toUser
		const userRef = doc(groupRef, "users", toUser);
		batch.update(userRef, { [`balance`]: increment(-toAmount) });
	});
}

/**
 * Create a transaction in a group and update relevant users balances.
 * @param groupId id of the group.
 * @param transaction transaction data.
 * @param leftUsers optional array of users who have left who's status needs to be recalculated.
 * @returns the id of the new transaction.
 */
export async function createTransaction(
	groupId: string,
	transaction: Transaction,
	leftUsers?: string[],
): Promise<string> {
	const batch = writeBatch(db);

	// Add the transaction to the group
	const groupRef = doc(db, "groups", groupId);
	const groupTransactionsRef = collection(groupRef, "transactions");
	const transactionRef = await addDoc(groupTransactionsRef, transaction);

	// Update users balances
	updateGroupBalances(groupRef, batch, transaction.from, transaction.to);

	// Update lastUpdate time
	updateGroupUpdateTime(groupRef, batch);

	await batch.commit();

	// Update any left users status
	if (leftUsers) {
		const leftUserBatch = writeBatch(db);
		await updateLeftUsersStatus(collection(groupRef, "users"), leftUserBatch, leftUsers);
		await leftUserBatch.commit();
	}

	// Return id of newly created transition
	return transactionRef.id;
}

/**
 * Update a transaction in a group and update relevant users balances.
 * @param groupId id of the group.
 * @param transactionId id of the transaction.
 * @param transaction new transaction data.
 * @param leftUsers optional array of users who have left who's status needs to be recalculated.
 */
export async function updateTransaction(
	groupId: string,
	transactionId: string,
	transaction: Transaction,
	leftUsers?: string[],
): Promise<void> {
	// Get the existing transaction data
	const groupRef = doc(db, "groups", groupId);
	const transactionRef = doc(groupRef, "transactions", transactionId);
	const transactionSnap = await getDoc(transactionRef);
	const oldTransaction = transactionSnap.data() as Transaction;

	const batch = writeBatch(db);

	// Update the transaction to the group
	batch.set(transactionRef, transaction);

	// Update balances by "Deleting" the old transaction and "Creating" the new one
	updateGroupBalances(
		groupRef,
		batch,
		oldTransaction.from,
		Object.fromEntries(Object.entries(oldTransaction.to).map(([userId, amount]) => [userId, -amount])),
	);
	updateGroupBalances(groupRef, batch, transaction.from, transaction.to);

	// Update lastUpdate time
	updateGroupUpdateTime(groupRef, batch);

	await batch.commit();

	// Update any left users status
	if (leftUsers) {
		const leftUserBatch = writeBatch(db);
		await updateLeftUsersStatus(collection(groupRef, "users"), leftUserBatch, leftUsers);
		await leftUserBatch.commit();
	}
}

/**
 * Delete a transaction in a group and update relevant users balances.
 * @param groupId id of the group.
 * @param transactionId id of the transaction.
 * @param leftUsers optional array of users who have left who's status needs to be recalculated.
 */
export async function deleteTransaction(groupId: string, transactionId: string, leftUsers?: string[]): Promise<void> {
	const groupRef = doc(db, "groups", groupId);

	// Get the existing transaction data
	const transactionRef = doc(groupRef, "transactions", transactionId);
	const transactionSnap = await getDoc(transactionRef);
	const transaction = transactionSnap.data() as Transaction;

	const batch = writeBatch(db);

	// Delete the transaction from the group
	batch.delete(transactionRef);

	// Update users balances, inverting the amounts
	updateGroupBalances(
		groupRef,
		batch,
		transaction.from,
		Object.fromEntries(Object.entries(transaction.to).map(([userId, amount]) => [userId, -amount])),
	);

	// Update lastUpdate time
	updateGroupUpdateTime(groupRef, batch);

	await batch.commit();

	// Update any left users status
	if (leftUsers) {
		const leftUserBatch = writeBatch(db);
		await updateLeftUsersStatus(collection(groupRef, "users"), leftUserBatch, leftUsers);
		await leftUserBatch.commit();
	}
}
