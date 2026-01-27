import { collection, doc, getDocs, query, setDoc, where, serverTimestamp } from "firebase/firestore";
import { db } from "../../shared/firebase/firestore";

const BUDGET_COL = 'budgets';

export type BudgetDoc = {
    id: string;
    userId: string;
    month: string;  //YYYY-MM
    amount: number;
}

export async function getBudgetForMonth(userId: string, month: string): Promise<BudgetDoc | null> {
    const q = query(
        collection(db, BUDGET_COL),
        where('userId', '==', userId),
        where('month', '==', month),
    );

    const snap = await getDocs(q);
    if (snap.empty) return null;

    const d = snap.docs[0];
    const data = d.data() as Omit<BudgetDoc, 'id'>;
    return { id: d.id, ...data };
}

export async function upsertBudget(userId: string, month: string, amount: number): Promise<void> {
    //deterministic doc id, ONE budget per user per month
    const id = `${userId}_${month}`;
    await setDoc(
        doc(db, BUDGET_COL, id),
        { userId, month, amount, updatedAt: serverTimestamp() },
        { merge: true },
    );
}
