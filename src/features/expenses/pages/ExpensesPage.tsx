import { useEffect, useMemo, useState } from 'react';
import type { Category, Expense } from '../../../shared/types/models';
import { useAuth } from '../../auth/auth.context';
import { listCategories } from '../../categories/categories.service';
import { createExpense, listExpenses, removeExpense, updateExpense } from '../expenses.service';
import { OfflineBanner } from '../../../shared/components/OfflineBanner';
import { getBudgetForMonth } from '../../budget/budget.service';
import { listExpensesInMonth } from '../expenses.service';
import { sendBudgetAlert } from '../../notifications/push.service';
import { getProfile } from '../../settings/profile.service';
import { normalizeCurrency } from '../../../shared/utils/currency';
import { convertAmount } from '../../../shared/services/fx.service';

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

    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [baseCurrency, setBaseCurrency] = useState("EUR");
    const [convertedById, setConvertedById] = useState<Record<string, number>>({});

    //form state
    const [amount, setAmount] = useState(''); // keep as string for input
    const [currency, setCurrency] = useState('EUR')
    const [categoryId, setCategoryId] = useState('');
    const [occurredAt, setOccurredAt] = useState(todayYmd());
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(true); //page bootstrap loading

    //edit state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editAmount, setEditAmount] = useState('');
    const [editCurrency, setEditCurrency] = useState('');
    const [editCategoryId, setEditCategoryId] = useState('');
    const [editOccurredAt, setEditOccurredAt] = useState('');
    const [editNote, setEditNote] = useState('');

    const categoryMap = useMemo(() => {
        const m = new Map<string, string>();
        categories.forEach((c) => m.set(c.id, c.name));
        return m;
    }, [categories]);

    //load categories and base currency
    useEffect(() => {
        if (!user) return;

        let cancelled = false;

        (async () => {
            try {
                setError(null);
                setLoading(true);   //start loading
                const cats = await listCategories(user.uid);

                const p = await getProfile(user.uid);
                setBaseCurrency(p.baseCurrency);
                setCurrency(p.baseCurrency);

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
                currency,
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

                const base = normalizeCurrency(currency);
                let totalBase = 0;

                for (const e of monthExpenses) {
                    totalBase += await convertAmount(e.occurredAt, e.amount, e.currency, base);
                }

                try {
                    if (totalBase >= budget.amount) {
                        await sendBudgetAlert(user.uid, {
                            title: 'Budget alert',
                            body: `You spent ${totalBase.toFixed(2)} ${base} this month (budget: ${budget.amount.toFixed(2)} ${base}).`,
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
        setEditCurrency(normalizeCurrency(e.currency));
        setEditCategoryId(e.categoryId);
        setEditOccurredAt(e.occurredAt);
        setEditNote(e.note ?? '');
    }

    async function cancelEditExpense() {
        setEditingId(null);
        setEditAmount('');
        setEditCurrency('');
        setEditCategoryId('');
        setEditOccurredAt('');
        setEditNote('');
    }

    //converts expenses in different currencies
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const base = normalizeCurrency(baseCurrency);
            const next: Record<string, number> = {};

            for (const e of expenses) {
                const from = normalizeCurrency(e.currency);
                if (from === base) continue;

                try {
                    next[e.id] = await convertAmount(e.occurredAt, e.amount, from, base);
                } catch {   //if fx fails/offline
                    next[e.id] = Number.NaN;
                }
            }

            if (!cancelled) setConvertedById(next);
        })();

        return () => {
            cancelled = true;
        }
    }, [expenses, baseCurrency]);

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
                        Currency
                        <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                            <option value="EUR">EUR</option>
                            <option value="USD">USD</option>
                            <option value="GBP">GBP</option>
                            <option value="CNY">CNY</option>
                            <option value="JPY">JPY</option>
                        </select>
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
                    <li
                        key={e.id}
                        style={{
                            display: "grid",
                            gridTemplateColumns: "110px 130px minmax(200px, 220px) minmax(50px, 100px) 140px",
                            gap: 12,
                            alignItems: "center",
                        }}
                    >
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

                                <div style={{ display: "flex", gap: 6 }}>
                                    <input
                                        value={editAmount}
                                        onChange={(ev) => setEditAmount(ev.target.value)}
                                        disabled={busy}
                                        style={{ width: "80%" }}
                                    />

                                    <select
                                        value={editCurrency}
                                        onChange={(ev) => setEditCurrency(ev.target.value)}
                                        disabled={busy}
                                    >
                                        <option value="EUR">EUR</option>
                                        <option value="USD">USD</option>
                                        <option value="GBP">GBP</option>
                                        <option value="CNY">CNY</option>
                                        <option value="JPY">JPY</option>
                                    </select>
                                </div>

                                <input
                                    value={editNote}
                                    onChange={(ev) => setEditNote(ev.target.value)}
                                    disabled={busy}
                                    placeholder="Note"
                                    style={{
                                        fontSize: 14,
                                        width: "82%"
                                    }}
                                />

                                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
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
                                                    currency: editCurrency,
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
                                </div>
                            </>
                        ) : (
                            <>
                                <span style={{ minWidth: 110 }}>{e.occurredAt}</span>
                                <span style={{ minWidth: 120 }}>
                                    {categoryMap.get(e.categoryId) ?? 'Unknown category'}
                                </span>
                                <strong style={{ minWidth: 180 }}>
                                    {(() => {
                                        const base = normalizeCurrency(baseCurrency);
                                        const from = normalizeCurrency(e.currency);
                                        const conv = convertedById[e.id];

                                        return (
                                            <>
                                                {e.amount.toFixed(2)} {from}
                                                {from !== base && (
                                                    <span style={{ color: "#666", marginLeft: 8 }}>
                                                        {conv === undefined
                                                            ? "(≈ ...)"
                                                            : Number.isNaN(conv)
                                                                ? "(≈ unavailable offline)"
                                                                : `(≈ ${conv.toFixed(2)} ${base})`}
                                                    </span>
                                                )}
                                            </>
                                        );
                                    })()}
                                </strong>
                                <span
                                    title={e.note}
                                    style={{
                                        color: "#666",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                        width: "82%"
                                    }}
                                >
                                    {e.note}
                                </span>


                                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                                    <button onClick={() => startEdit(e)} disabled={busy}>
                                        Edit
                                    </button>
                                    <button onClick={() => onDelete(e.id)} disabled={busy}>
                                        Delete
                                    </button>
                                </div>
                            </>
                        )}
                    </li>
                ))}
            </ul>

            {expenses.length === 0 && <p style={{ color: '#666' }}>No expenses yet.</p>}
        </div>
    );
}