import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../shared/firebase/firestore";
import { normalizeCurrency } from "../../shared/utils/currency";

const BUDGET_COL = 'budgets';

export type BudgetDoc = {
    id: string;
    userId: string;
    month: string;  //YYYY-MM
    amount: number;
    currency: string;   //currency used when budget was set
}

//gets budget with deterministic id 
export async function getBudgetForMonth(userId: string, month: string): Promise<BudgetDoc | null> {
    const id = `${userId}_${month}`;
    const ref = doc(db, BUDGET_COL, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;

    const data = snap.data() as Omit<BudgetDoc, 'id'>;
    return { id: id, ...data, currency: normalizeCurrency(data.currency) };
}

export async function upsertBudget(userId: string, month: string, amount: number, currency: string): Promise<void> {
    //deterministic doc id, ONE budget per user per month
    const id = `${userId}_${month}`;
    await setDoc(
        doc(db, BUDGET_COL, id),
        { userId, month, amount, currency: normalizeCurrency(currency), updatedAt: serverTimestamp() },
        { merge: true },
    );
}
