import { useEffect, useMemo, useState } from 'react';
import type { Category, Expense } from '../../../shared/types/models';
import { currentMonth } from '../../../shared/utils/date';
import { useAuth } from '../../auth/auth.context';
import { listCategories } from '../../categories/categories.service';
import { listExpensesInMonth } from '../../expenses/expenses.service';
import { OfflineBanner } from '../../../shared/components/OfflineBanner';
import { getBudgetForMonth, upsertBudget } from '../../budget/budget.service';

type CategoryTotal = {
    categoryId: string,
    name: string;
    total: number
}

export function DashboardPage() {
    const { user } = useAuth();
    const [month, setMonth] = useState(currentMonth());
    const [categories, setCategories] = useState<Category[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [budgetInput, setBudgetInput] = useState('');
    const [savedBudget, setSavedBudget] = useState<number | null>(null);
    const [editingBudget, setEditingBugdet] = useState(false);

    useEffect(() => {
        if (!user) return;

        let cancelled = false;

        (async () => {
            try {
                setLoading(true);
                setError(null);

                //load ONCE categories, month expenses and budget (in parallel)
                const [cats, exps, budget] = await Promise.all([
                    listCategories(user.uid),
                    listExpensesInMonth(user.uid, month),
                    getBudgetForMonth(user.uid, month),
                ]);

                if (cancelled) return;

                setCategories(cats);
                setExpenses(exps);

                if (budget) {
                    setSavedBudget(budget.amount);
                    setBudgetInput(String(budget.amount));
                    setEditingBugdet(false);
                } else {
                    setSavedBudget(null);
                    setBudgetInput('');
                    setEditingBugdet(true);
                }
            } catch (e: unknown) {
                console.error(e);
                if (!cancelled) setError('Failed to load dashboard data.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [user?.uid, month]);

    const categoryMap = useMemo(() => {
        const m = new Map<string, string>();
        categories.forEach((c) => m.set(c.id, c.name));
        return m;
    }, [categories]);

    const totalMonth = useMemo(() => {
        return expenses.reduce((sum, e) => sum + e.amount, 0)
    }, [expenses]);

    const totalsByCategory = useMemo((): CategoryTotal[] => {
        const acc = new Map<string, number>();
        for (const e of expenses) {
            acc.set(e.categoryId, (acc.get(e.categoryId) ?? 0) + e.amount);
        }

        const result: CategoryTotal[] = [];
        for (const [categoryId, total] of acc.entries()) {
            result.push({
                categoryId,
                name: categoryMap.get(categoryId) ?? 'Unknown category',
                total,
            });
        }

        result.sort((a, b) => b.total - a.total);
        return result;
    }, [expenses, categoryMap]);

    function onStartEditBudget() {
        setBudgetInput(savedBudget == null ? '' : String(savedBudget));
        setEditingBugdet(true);
    }

    function onCancelEditBudget() {
        setBudgetInput(savedBudget == null ? '' : String(savedBudget));
        setEditingBugdet(false);
    }

    //handler to save budget
    async function onSaveBudget() {
        if (!user) return;

        const value = Number(budgetInput);
        if (!Number.isFinite(value) || value <= 0) {
            setError('Budget must be a positive number.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await upsertBudget(user.uid, month, value);
            setSavedBudget(value);
            setEditingBugdet(false);
        } catch (e: unknown) {
            console.error(e);
            setError('Failed to save budget.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div>
            <h2>Dashboard</h2>

            <OfflineBanner />

            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                <p>
                    Month
                </p>
                <input
                    type="month"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    disabled={loading}
                />
            </div>

            {loading && <p style={{ color: '#666' }}>Loading...</p>}
            {error && <p style={{ color: 'crimson' }}>{error}</p>}

            {!loading && !error && (
                <>
                    <h3 style={{ marginTop: 20 }}>Monthly Budget</h3>

                    {savedBudget == null && !editingBudget && (
                        <p style={{ color: '#666' }}>No budget set for this month.</p>
                    )}

                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 6 }}>
                        {!editingBudget ? (
                            <>
                                <span>
                                    {savedBudget == null ? (
                                        <span style={{ color: '#666' }}>Not set</span>
                                    ) : (
                                        <p style={{ fontSize: 20, marginTop: 6 }}>{savedBudget.toFixed(2)}</p>
                                    )}
                                </span>

                                <button onClick={onStartEditBudget} disabled={loading} style={{ marginBottom: 12 }}>
                                    {savedBudget == null ? 'Set' : 'Edit'}
                                </button>
                            </>
                        ) : (
                            <>
                                <input
                                    placeholder="e.g. 500"
                                    value={budgetInput}
                                    onChange={(e) => setBudgetInput(e.target.value)}
                                    disabled={loading}
                                    style={{ width: 160 }}
                                />
                                <button onClick={onSaveBudget} disabled={loading}>
                                    {loading ? 'Working...' : 'Save'}
                                </button>
                                {savedBudget != null && (
                                    <button onClick={onCancelEditBudget} disabled={loading}>
                                        Cancel
                                    </button>
                                )}
                            </>
                        )}
                    </div>

                    <h3 style={{ marginTop: 16 }}>Monthly Total</h3>
                    <p style={{ fontSize: 20, marginTop: 6 }}>
                        {totalMonth.toFixed(2)}
                    </p>

                    <h3 style={{ marginTop: 16 }}>By Category</h3>
                    <ul style={{ marginTop: 16 }}>
                        {totalsByCategory.map((t) => (
                            <li key={t.categoryId} style={{ display: 'flex', gap: 10 }}>
                                <span style={{ minWidth: 160 }}>{t.name}</span>
                                <strong>{t.total.toFixed(2)}</strong>
                            </li>
                        ))}
                    </ul>

                    {expenses.length === 0 && (
                        <p style={{ color: '#666' }}>No expenses for this month.</p>
                    )}
                </>
            )}
        </div>
    )
}