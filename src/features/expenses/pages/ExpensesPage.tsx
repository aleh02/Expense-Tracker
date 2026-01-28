import { useEffect, useMemo, useState } from 'react';
import type { Category, Expense } from '../../../shared/types/models';
import { useAuth } from '../../auth/auth.context';
import { listCategories } from '../../categories/categories.service';
import { createExpense, listExpenses, removeExpense, updateExpense } from '../expenses.service';
import { OfflineBanner } from '../../../shared/components/OfflineBanner';
import { getBudgetForMonth } from '../../budget/budget.service';
import { listExpensesInMonth } from '../expenses.service';
import { sendBudgetAlert } from '../../notifications/push.service';

//Today's date as YYYY-MM-DD (local)
function todayYmd(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');   //months are 0-indexed in JS
    const dd = String(d.getDate()).padStart(2, '0');    //2 digits, adds 0 to the start if only 1 digit
    return `${yyyy}-${mm}-${dd}`;
}

export function ExpensesPage() {
    const { user } = useAuth(); //ensures user exists

    const [categories, setCategories] = useState<Category[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);

    //form state
    const [amount, setAmount] = useState(''); // keep as string for input
    const [categoryId, setCategoryId] = useState('');
    const [occurredAt, setOccurredAt] = useState(todayYmd());
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(true); //page bootstrap loading

    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    //edit state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editAmount, setEditAmount] = useState('');
    const [editCategoryId, setEditCategoryId] = useState('');
    const [editOccurredAt, setEditOccurredAt] = useState('');
    const [editNote, setEditNote] = useState('');

    const categoryMap = useMemo(() => {
        const m = new Map<string, string>();
        categories.forEach((c) => m.set(c.id, c.name));
        return m;
    }, [categories]);

    //load categories
    useEffect(() => {
        if (!user) return;

        let cancelled = false;

        (async () => {
            try {
                setError(null);
                setLoading(true);   //start loading
                const cats = await listCategories(user.uid);
                if (!cancelled) setCategories(cats);
            } catch (e: unknown) {
                console.error(e);
                if (!cancelled) setError('Failed to load categories.');
            } finally {
                if (!cancelled) setLoading(false); //done loading
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [user?.uid]);

    //set default category when categories arrive
    useEffect(() => {
        if (categoryId) return;
        if (categories.length === 0) return;

        setCategoryId(categories[0].id);
    }, [categories, categoryId]);

    //load expenses for current user
    useEffect(() => {
        if (!user) return;

        let cancelled = false;

        (async () => {
            try {
                setError(null);
                const exps = await listExpenses(user.uid);
                if (!cancelled) setExpenses(exps);
            } catch (e: unknown) {
                console.error(e);
                if (!cancelled) setError('Failed to load expenses.');
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [user?.uid]);

    async function reloadExpenses() {
        if (!user) return;
        const exps = await listExpenses(user.uid);
        setExpenses(exps);
    }

    async function onAdd() {
        if (!user) return;

        const value = Number(amount);
        if (!Number.isFinite(value) || value <= 0) {
            setError('Amount must be a positive number.');
            return;
        }
        if (!categoryId) {
            setError('Please select a category.');
            return;
        }

        setBusy(true);
        setError(null);

        try {
            await createExpense(user.uid, {
                amount: value,
                categoryId,
                occurredAt,
                note,
            });

            setAmount('');
            setNote('');

            await reloadExpenses();

            //budget check + push
            const month = occurredAt.slice(0, 7); //YYYY-MM from expense date
            const budget = await getBudgetForMonth(user.uid, month);

            if (budget) {
                const monthExpenses = await listExpensesInMonth(user.uid, month);
                const total = monthExpenses.reduce((s, e) => s + e.amount, 0);

                try {
                    if (budget && total >= budget.amount) {
                        await sendBudgetAlert(user.uid, {
                            title: 'Budget alert',
                            body: `You spent ${total.toFixed(2)} this month (budget: ${budget.amount.toFixed(2)}).`,
                            url: '/app/dashboard',
                        });
                    }
                } catch (e: unknown) {
                    console.warn('Push not sent (likely not subscribed):', e);
                }
            }
        } catch (e: unknown) {
            console.error(e);
            setError('Failed to create expense.');
        } finally {
            setBusy(false);
        }
    }

    async function onDelete(id: string) {
        setBusy(true);
        setError(null);

        try {
            await removeExpense(id);
            await reloadExpenses();
        } catch (e: unknown) {
            console.error(e);
            setError('Failed to delete expense.');
        } finally {
            setBusy(false);
        }
    }

    async function startEdit(e: Expense) {
        setEditingId(e.id);
        setEditAmount(String(e.amount));
        setEditCategoryId(e.categoryId);
        setEditOccurredAt(e.occurredAt);
        setEditNote(e.note ?? '');
    }

    async function cancelEditExpense() {
        setEditingId(null);
        setEditAmount('');
        setEditCategoryId('');
        setEditOccurredAt('');
        setEditNote('');
    }

    if (loading) {
        return (
            <div>
                <h2>Expenses</h2>
                <p style={{ color: '#666' }}>Loading...</p>
            </div>
        );
    }

    return (
        <div>
            <h2>Expenses</h2>

            <OfflineBanner />

            <p style={{ color: '#666', marginTop: 4 }}>
                Add expenses and track them by date and category.
            </p>

            {categories.length === 0 ? (
                <p style={{ color: 'crimson' }}>
                    You need at least one category before adding expenses.
                </p>
            ) : (
                <div style={{ display: 'grid', gap: 8, maxWidth: 520, marginTop: 12 }}>
                    <label>
                        Amount
                        <input
                            placeholder="e.g. 12.50"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            disabled={busy}
                        />
                    </label>

                    <label>
                        Category
                        <select
                            value={categoryId}
                            onChange={(e) => setCategoryId(e.target.value)}
                            disabled={busy}
                        >
                            {categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label>
                        Date
                        <input
                            type="date"
                            value={occurredAt}
                            onChange={(e) => setOccurredAt(e.target.value)}
                            disabled={busy}
                        />
                    </label>

                    <label>
                        Note (optional)
                        <input
                            placeholder="e.g. lunch with friends"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            disabled={busy}
                        />
                    </label>

                    <button onClick={onAdd} disabled={busy || categories.length === 0}>
                        {busy ? 'Working...' : 'Add expense'}
                    </button>
                </div>
            )}

            {error && <p style={{ color: 'crimson' }}>{error}</p>}

            <h3 style={{ marginTop: 20 }}>Recent expenses</h3>

            <ul style={{ marginTop: 8 }}>
                {expenses.map((e) => (
                    <li key={e.id} style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                        {editingId === e.id ? (
                            <>
                                <input
                                    type="date"
                                    value={editOccurredAt}
                                    onChange={(ev) => setEditOccurredAt(ev.target.value)}
                                    disabled={busy}
                                />

                                <select
                                    value={editCategoryId}
                                    onChange={(ev) => setEditCategoryId(ev.target.value)}
                                    disabled={busy}
                                >
                                    {categories.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>

                                <input
                                    value={editAmount}
                                    onChange={(ev) => setEditAmount(ev.target.value)}
                                    disabled={busy}
                                    style={{ width: 90 }}
                                />

                                <input
                                    value={editNote}
                                    onChange={(ev) => setEditNote(ev.target.value)}
                                    disabled={busy}
                                    placeholder="Note"
                                    style={{ width: 180 }}
                                />

                                <button
                                    onClick={async () => {
                                        if (!user) return;

                                        const value = Number(editAmount);
                                        if (!Number.isFinite(value) || value <= 0) {
                                            setError('Amount must be a positive number.');
                                            return;
                                        }
                                        if (!editCategoryId) {
                                            setError('Please select a category.');
                                            return;
                                        }
                                        if (!editOccurredAt) {
                                            setError('Please select a date.');
                                            return;
                                        }

                                        setBusy(true);
                                        setError(null);

                                        try {
                                            await updateExpense(e.id, {
                                                amount: value,
                                                categoryId: editCategoryId,
                                                occurredAt: editOccurredAt,
                                                note: editNote,
                                            });

                                            await reloadExpenses();
                                            cancelEditExpense();
                                        } catch (err: unknown) {
                                            console.error(err);
                                            setError('Failed to update expense.');
                                        } finally {
                                            setBusy(false);
                                        }
                                    }}
                                    disabled={busy}
                                >
                                    Save
                                </button>

                                <button onClick={cancelEditExpense} disabled={busy}>
                                    Cancel
                                </button>
                            </>
                        ) : (
                            <>
                                <span style={{ minWidth: 110 }}>{e.occurredAt}</span>
                                <span style={{ minWidth: 120 }}>
                                    {categoryMap.get(e.categoryId) ?? 'Unknown category'}
                                </span>
                                <strong style={{ minWidth: 80 }}>{e.amount.toFixed(2)}</strong>
                                <span style={{ flex: 1, color: '#666' }}>{e.note}</span>
                                <button onClick={() => startEdit(e)} disabled={busy}>
                                    Edit
                                </button>
                                <button onClick={() => onDelete(e.id)} disabled={busy}>
                                    Delete
                                </button>
                            </>
                        )}
                    </li>
                ))}
            </ul>

            {expenses.length === 0 && <p style={{ color: '#666' }}>No expenses yet.</p>}
        </div>
    );
}