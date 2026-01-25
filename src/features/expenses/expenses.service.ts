import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    orderBy,
    query,
    where,
    serverTimestamp,
} from "firebase/firestore";
import { db } from "../../shared/firebase/firestore";
import type { Expense } from "../../shared/types/models";

const EXPENSES_COL = 'expenses';

export async function listExpenses(userId: string) {
    //gets current user's expense, newest first
    const q = query(
        collection(db, EXPENSES_COL),
        where('userId', '==', userId),
        orderBy('occurredAt', 'desc'),
    );

    const snap = await getDocs(q);

    return snap.docs.map((d) => {
        const data = d.data() as Omit<Expense, 'id'>;
        return { id: d.id, ...data };
    });
}

export async function createExpense(userId: string, input: {
    amount: number;
    categoryId: string;
    occurredAt: string;
    note?: string;
}): Promise<void> {
    await addDoc(collection(db, EXPENSES_COL), {
        userId,
        amount: input.amount,
        categoryId: input.categoryId,
        occurredAt: input.occurredAt,
        note: input.note?.trim() || '',
        createdAt: serverTimestamp(),
    });
}

export async function removeExpense(expenseId: string): Promise<void> {
    await deleteDoc(doc(db, EXPENSES_COL, expenseId));
}

