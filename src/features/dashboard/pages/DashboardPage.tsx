import { useEffect, useMemo, useState } from 'react';
import type { Category, Expense } from '../../../shared/types/models';
import { currentMonth } from '../../../shared/utils/date';
import { useAuth } from '../../auth/auth.context';
import { listCategories } from '../../categories/categories.service';
import { listExpensesInMonth } from '../../expenses/expenses.service';
import { OfflineBanner } from '../../../shared/components/OfflineBanner';
import { getBudgetForMonth, upsertBudget } from '../../budget/budget.service';
import { CategoryDonut } from '../components/CategoryDonut';
import { convertAmount } from '../../../shared/services/fx.service';
import { getProfile } from '../../settings/profile.service';
import { normalizeCurrency } from '../../../shared/utils/currency';

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
    const [savedBudgetCurrency, setSavedBudgetCurrency] = useState<string>("EUR");
    const [editingBudget, setEditingBudget] = useState(false);

    const [budgetBase, setBudgetBase] = useState<number | null>(null);
    const [budgetBaseLoading, setBudgetBaseLoading] = useState(false);

    const [baseCurrency, setBaseCurrency] = useState('EUR');

    const [totalsLoading, setTotalsLoading] = useState(false);
    const [totalMonthBase, setTotalMonthBase] = useState(0);
    const [totalsByCategoryBase, setTotalsByCategoryBase] = useState<Map<string, number>>(new Map());


    //loads base currency
    useEffect(() => {
        if (!user) return;
        (async () => {
            const p = await getProfile(user.uid);
            setBaseCurrency(p.baseCurrency);
        })();
    }, [user?.uid]);


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
                    setSavedBudgetCurrency(normalizeCurrency(budget.currency));
                    setBudgetInput(String(budget.amount));
                    setEditingBudget(false);
                } else {
                    setSavedBudget(null);
                    setSavedBudgetCurrency(baseCurrency);
                    setBudgetInput('');
                    setEditingBudget(true);
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

    //calculates total by month and by category
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                setTotalsLoading(true);

                let total = 0;
                const byCat = new Map<string, number>();    //by category

                for (const e of expenses) {
                    const baseValue = await convertAmount(e.occurredAt, e.amount, e.currency, baseCurrency);

                    total += baseValue;
                    byCat.set(e.categoryId, (byCat.get(e.categoryId) ?? 0) + baseValue);
                }

                if (cancelled) return;
                setTotalMonthBase(total);
                setTotalsByCategoryBase(byCat);
            } finally {
                if (!cancelled) setTotalsLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [expenses, baseCurrency]);

    const totalsByCategory = useMemo((): CategoryTotal[] => {
        const result: CategoryTotal[] = [];

        for (const [categoryId, total] of totalsByCategoryBase.entries()) {
            result.push({
                categoryId,
                name: categoryMap.get(categoryId) ?? 'Unknown category',
                total,
            });
        }
        result.sort((a, b) => b.total - a.total);
        return result;
    }, [totalsByCategoryBase, categoryMap]);

    function onStartEditBudget() {
        setBudgetInput(savedBudget == null ? '' : String(savedBudget));
        setSavedBudgetCurrency(baseCurrency);
        setEditingBudget(true);
    }

    function onCancelEditBudget() {
        setBudgetInput(savedBudget == null ? '' : String(savedBudget));
        setEditingBudget(false);
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
            await upsertBudget(user.uid, month, value, baseCurrency);
            setSavedBudget(value);
            setSavedBudgetCurrency(baseCurrency);
            setEditingBudget(false);
        } catch (e: unknown) {
            console.error(e);
            setError('Failed to save budget.');
        } finally {
            setLoading(false);
        }
    }

    //display budget comparison
    useEffect(() => {
        let cancelled = false;

        (async () => {
            if (savedBudget == null) {
                setBudgetBase(null);
                return;
            }

            try {
                setBudgetBaseLoading(true);

                const date = `${month}-01`; // budget reference date

                const converted = await convertAmount(date, savedBudget, savedBudgetCurrency, baseCurrency);
                if (!cancelled) setBudgetBase(converted);
            } catch (e: unknown) {
                console.error(e);
            } finally {
                if (!cancelled) setBudgetBaseLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        }
    }, [savedBudget, savedBudgetCurrency, baseCurrency, month]);

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
                                        <div style={{ marginTop: 6 }}>
                                            <p style={{ fontSize: 20, marginTop: 6 }}>
                                                {savedBudget.toFixed(2)} {savedBudgetCurrency}
                                            </p>

                                            {normalizeCurrency(savedBudgetCurrency) !== normalizeCurrency(baseCurrency) && (
                                                <p style={{ color: "#666", marginTop: 4 }}>
                                                    ≈ {budgetBaseLoading ? "..." : `${(budgetBase ?? 0).toFixed(2)} ${baseCurrency}`} (converted)
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </span>

                                <button onClick={onStartEditBudget} disabled={loading} style={{ marginBottom: 12 }}>
                                    {savedBudget == null ? 'Set' : 'Edit'}
                                </button>
                            </>
                        ) : (
                            <>
                                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                    <input
                                        placeholder={`e.g. 500 (${baseCurrency})`}
                                        value={budgetInput}
                                        onChange={(e) => setBudgetInput(e.target.value)}
                                        disabled={loading}
                                        style={{ width: 160 }}
                                    />
                                    <span style={{ color: "#666", minWidth: 48 }}>{baseCurrency}</span>
                                </div>
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

                    <h3 style={{ marginTop: 16 }}>Monthly Total ({baseCurrency})</h3>
                    {totalsLoading ? (
                        <p style={{ color: '#666' }}>Loading...</p>
                    ) : (
                        <p style={{ fontSize: 20, marginTop: 6 }}>
                            {totalMonthBase.toFixed(2)}
                        </p>
                    )
                    }

                    {savedBudget != null && !totalsLoading && (
                        <p style={{ marginTop: 6, color: totalMonthBase >= savedBudget ? "crimson" : "#666" }}>
                            {totalMonthBase >= savedBudget
                                ? `Over budget by ${(totalMonthBase - savedBudget).toFixed(2)} ${baseCurrency}.`
                                : `Remaining ${(savedBudget - totalMonthBase).toFixed(2)} ${baseCurrency}.`}
                        </p>
                    )}


                    <h3 style={{ marginTop: 16 }}>By Category ({baseCurrency})</h3>
                    {totalsLoading && <p style={{ color: '#666' }}>Loading...</p>}
                    <ul style={{ marginTop: 16 }}>
                        {totalsByCategory.map((t) => (
                            <li
                                key={t.categoryId}
                                style={{
                                    display: 'flex',
                                    gap: 10,
                                    alignItems: 'center',
                                    padding: 10,
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: 10,
                                    maxWidth: 350,
                                }}
                            >
                                <CategoryDonut value={t.total} total={totalMonthBase} size={52} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600 }}>{t.name}</div>
                                    <div style={{ color: '#666', marginTop: 2 }}>
                                        {t.total.toFixed(2)}
                                    </div>
                                </div>
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