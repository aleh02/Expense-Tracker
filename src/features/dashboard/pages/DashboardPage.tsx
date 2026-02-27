import { useEffect, useMemo, useState } from 'react';
import type { Category, Expense } from '../../../shared/types/models';
import { currentMonth } from '../../../shared/utils/date';
import { useAuth } from '../../auth/useAuth';
import { listCategories } from '../../categories/categories.service';
import { listExpensesInMonth } from '../../expenses/expenses.service';
import { OfflineBanner } from '../../../shared/components/OfflineBanner';
import { getBudgetForMonth, upsertBudget } from '../../budget/budget.service';
import { CategoryDonut } from '../components/CategoryDonut';
import { convertAmount } from '../../../shared/services/fx.service';
import { getProfile } from '../../settings/profile.service';
import { normalizeCurrency } from '../../../shared/utils/currency';
import styles from "../../../app/layouts/AppShell.module.css";

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
    const [savingBudget, setSavingBudget] = useState(false);

    const [baseCurrency, setBaseCurrency] = useState('EUR');

    const [totalsLoading, setTotalsLoading] = useState(false);
    const [totalMonthBase, setTotalMonthBase] = useState(0);
    const [totalsByCategoryBase, setTotalsByCategoryBase] = useState<Map<string, number>>(new Map());


    //loads base currency
    useEffect(() => {
        if (!user) return;

        (async () => {
            try {
                const p = await getProfile(user.uid);
                setBaseCurrency(p?.baseCurrency ?? "EUR");
            } catch (e) {
                console.warn("getProfile failed, fallback to EUR", e);
                setBaseCurrency("EUR");
            }
        })();
    }, [user?.uid]);

    //reload dashboard data when month or base currency changes
    //baseCurrency is included so the "no budget yet" branch uses the current currency
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
                    setSavedBudgetCurrency(normalizeCurrency(baseCurrency));
                    setBudgetInput('');
                    setEditingBudget(false);
                }
            } catch (e: unknown) {
                console.error("Dashboard load failed:", e);
                if (e && typeof e === "object" && "message" in e) {
                    console.log("Firestore error message:", (e as { message?: unknown }).message);
                }
                if (!cancelled) setError('Failed to load dashboard data.');
            }
            finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [user?.uid, month, baseCurrency]);

    const categoryMap = useMemo(() => {
        const m = new Map<string, string>();
        categories.forEach((c) => m.set(c.id, c.name));
        return m;
    }, [categories]);

    //build month totals in current base currency
    //each expense is converted using the historical rate of its own date
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                setTotalsLoading(true);

                let total = 0;
                const byCat = new Map<string, number>();    //by category

                for (const e of expenses) {
                    let baseValue = 0;
                    try{
                        baseValue = await convertAmount(e.occurredAt, e.amount, e.currency, baseCurrency);
                    } catch(err: unknown) {
                        //keep rendering the rest, one failed conversion should not block the whole dashboard
                        //totals may be slightly lower until rates are available again
                        console.warn("convertAmount failed: ", err);
                        continue;
                    }
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

    //derived view model for chart and list rendering
    //keep sorting here so rendering code stays simple
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

        setSavingBudget(true);
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
            setSavingBudget(false);
        }
    }

    //keep budget and expenses in the same display currency before comparing
    useEffect(() => {
        let cancelled = false;

        (async () => {
            if (savedBudget == null) {
                setBudgetBase(null);
                return;
            }

            try {
                setBudgetBaseLoading(true);

                //use first day of the selected month as a stable reference date for conversion
                const date = `${month}-01`;

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

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        onSaveBudget();
    }

    return (
        <div style={{ marginTop: -18, maxWidth: 1100, padding: "24px 16px" }}>
            <h2 className={styles.h2}>Dashboard</h2>

            <OfflineBanner />

            <div style={{ display: "grid", gap: 14, marginTop: 14, maxWidth: 720 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                        className={styles.label}
                        style={{ fontSize: 18, fontWeight: 600, minWidth: 60 }}
                    >
                        Month
                    </div>

                    <input
                        className={styles.input}
                        type="month"
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        disabled={loading}
                        style={{ height: 32, padding: "0px 10px", borderRadius: 10 }}
                    />
                </div>

                {loading && <p className={styles.muted} style={{ margin: 0 }}>Loading...</p>}
                {error && <p className={styles.danger} style={{ margin: 0 }}>{error}</p>}

                {!loading && !error && (
                    <div className={styles.twoCol} style={{ marginTop: 4 }}>
                        <div
                            className={styles.card}
                            style={{
                                padding: 14,
                                borderRadius: 14,
                                width: 330,
                            }}
                        >
                            <div className={styles.cardTitle} style={{ fontWeight: 700, marginBottom: 10 }}>
                                Monthly Budget
                            </div>

                            {!editingBudget ? (
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "flex-start",
                                        justifyContent: "space-between",
                                        gap: 12,
                                    }}
                                >
                                    <div>
                                        {savedBudget == null ? (
                                            <div className={styles.muted}>Not set</div>
                                        ) : (
                                            <>
                                                <div style={{ fontSize: 20, fontWeight: 700, marginTop: 3 }}>
                                                    {savedBudget.toFixed(2)} {savedBudgetCurrency}
                                                </div>

                                                {normalizeCurrency(savedBudgetCurrency) !== normalizeCurrency(baseCurrency) && (
                                                    <div className={styles.muted} style={{ marginTop: 4 }}>
                                                        ≈ {budgetBaseLoading ? "..." : `${(budgetBase ?? 0).toFixed(2)} ${baseCurrency}`} (converted)
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>

                                    <div style={{ marginTop: -1 }}>
                                        <button
                                            className={styles.btn}
                                            onClick={onStartEditBudget}
                                            disabled={loading}
                                            style={{ height: 32, padding: "0 12px", borderRadius: 10 }}
                                        >
                                            {savedBudget == null ? "Set" : "Edit"}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} style={{ maxWidth: 330, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                        <input
                                            className={styles.input}
                                            placeholder={`e.g. 500 (${baseCurrency})`}
                                            value={budgetInput}
                                            onChange={(e) => setBudgetInput(e.target.value)}
                                            disabled={loading}
                                            style={{ width: 100, height: 32, padding: "4px 10px", borderRadius: 10 }}
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === "Escape") {
                                                    e.preventDefault();
                                                    onCancelEditBudget();
                                                }
                                            }}
                                        />
                                        <span className={styles.muted} style={{ minWidth: 48 }}>
                                            {baseCurrency}
                                        </span>
                                    </div>

                                    <div style={{ display: "flex", gap: 8 }}>
                                        <button
                                            className={`${styles.btn} ${styles.btnPrimary}`}
                                            type="submit"
                                            disabled={loading || savingBudget}
                                            style={{ height: 32, padding: "0 12px", borderRadius: 10 }}
                                        >
                                            {loading ? "Saving..." : "Save"}
                                        </button>

                                        <button
                                            className={styles.btn}
                                            type="button"
                                            onClick={onCancelEditBudget}
                                            disabled={loading || savingBudget}
                                            style={{ height: 32, padding: "0 12px", borderRadius: 10 }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>

                        <div
                            className={styles.card}
                            style={{
                                padding: 14,
                                borderRadius: 14,
                                width: 330,
                            }}
                        >
                            <div className={styles.cardTitle} style={{ fontWeight: 700, marginBottom: 10 }}>
                                Monthly Total
                            </div>

                            {totalsLoading ? (
                                <div className={styles.muted}>Loading...</div>
                            ) : (
                                <div style={{ fontSize: 20, fontWeight: 700 }}>
                                    {totalMonthBase.toFixed(2)} {baseCurrency}
                                </div>
                            )}

                            {savedBudget != null && !totalsLoading && (
                                <div
                                    style={{
                                        marginTop: 8,
                                        color: totalMonthBase >= savedBudget ? "#ff6b6b" : "rgba(233,233,234,0.55)",
                                    }}
                                >
                                    {totalMonthBase >= savedBudget
                                        ? `Over budget by ${(totalMonthBase - savedBudget).toFixed(2)} ${baseCurrency}.`
                                        : `Remaining ${(savedBudget - totalMonthBase).toFixed(2)} ${baseCurrency}.`}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <h3 className={styles.h3} style={{ fontSize: 21, marginTop: 32 }}>
                By Category ({baseCurrency})
            </h3>

            {totalsLoading && <p className={styles.muted}>Loading...</p>}

            <div style={{ maxWidth: 700, marginTop: 16 }}>
                <ul style={{ marginTop: 16 }}>
                    {totalsByCategory.map((t) => (
                        <li
                            key={t.categoryId}
                            className={styles.listItem}
                            style={{
                                gap: 32,
                                alignItems: "center",
                                padding: 10,
                                borderRadius: 10,
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr 1fr",
                            }}
                        >
                            <div style={{ fontSize: 20, fontWeight: 600, marginLeft: 20, textAlign: "left" }}>
                                {t.name}
                            </div>

                            <div className={styles.muted} style={{ fontSize: 20, marginLeft: 35, textAlign: "left" }}>
                                {t.total.toFixed(2)} ({baseCurrency})
                            </div>

                            <div style={{ marginLeft: 100 }}>
                                <CategoryDonut value={t.total} total={totalMonthBase} size={52} />
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            {expenses.length === 0 && <p className={styles.muted}>No expenses for this month.</p>}
        </div>
    );
}
