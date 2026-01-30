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
    updateDoc,
} from "firebase/firestore";
import { db } from "../../shared/firebase/firestore";
import type { Expense } from "../../shared/types/models";
import { monthRange } from "../../shared/utils/date";
import { normalizeCurrency } from "../../shared/utils/currency";

const EXPENSES_COL = 'expenses';

export type ExpenseUpdateInput = {
    amount: number;
    currency: string;
    categoryId: string;
    occurredAt: string; // YYYY-MM-DD
    note?: string;
};

export async function listExpenses(userId: string) {
    //gets current user's expense, newest first
    const q = query(
        collection(db, EXPENSES_COL),
        where('userId', '==', userId),
        orderBy('occurredAt', 'desc'),
        orderBy('createdAt', 'desc')
    );

    const snap = await getDocs(q);

    return snap.docs.map((d) => {
        const data = d.data() as Omit<Expense, 'id'>;
        return { id: d.id, ...data, currency: normalizeCurrency(data.currency), };
    });
}

export async function createExpense(
    userId: string,
    input: {
        amount: number;
        currency: string;
        categoryId: string;
        occurredAt: string;
        note?: string;
    }): Promise<void> {
    await addDoc(collection(db, EXPENSES_COL), {
        userId,
        amount: input.amount,
        currency: normalizeCurrency(input.currency),
        categoryId: input.categoryId,
        occurredAt: input.occurredAt,
        note: input.note?.trim() || '',
        createdAt: serverTimestamp(),
    });
}

export async function removeExpense(expenseId: string): Promise<void> {
    await deleteDoc(doc(db, EXPENSES_COL, expenseId));
}

export async function updateExpense(expenseId: string, input: ExpenseUpdateInput): Promise<void> {
    await updateDoc(doc(db, EXPENSES_COL, expenseId), {
        amount: input.amount,
        currency: normalizeCurrency(input.currency),
        categoryId: input.categoryId,
        occurredAt: input.occurredAt,
        note: input.note?.trim() || '',
    });
}

export async function listExpensesInMonth(userId: string, month: string): Promise<Expense[]> {
    //filter by occuredAt string range [start, endExclusive)
    const { start, endExclusive } = monthRange(month);

    const q = query(
        collection(db, EXPENSES_COL),
        where('userId', '==', userId),
        where('occurredAt', '>=', start),
        where('occurredAt', '<', endExclusive),
        orderBy('occurredAt', 'desc'),
        orderBy('createdAt', 'desc')
    );

    const snap = await getDocs(q);

    return snap.docs.map((d) => {
        const data = d.data() as Omit<Expense, 'id'>;
        return { id: d.id, ...data, currency: normalizeCurrency(data.currency), };
    });
}

