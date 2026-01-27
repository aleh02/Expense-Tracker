import { useEffect, useMemo, useState } from 'react';
import type { Category, Expense } from '../../../shared/types/models';
import { currentMonth } from '../../../shared/utils/date';
import { useAuth } from '../../auth/auth.context';
import { listCategories } from '../../categories/categories.service';
import { listExpensesInMonth } from '../../expenses/expenses.service';
import { OfflineBanner } from '../../../shared/components/OfflineBanner';
import { enablePushNotifications, sendBudgetAlert } from '../../notifications/push.service';

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

    const [pushBusy, setPushBusy] = useState(false);
    const [pushMsg, setPushMsg] = useState<string | null>(null)

    async function onEnablePush() {
        if(!user) return;
        setPushBusy(true);
        setPushMsg(null);
        try {
            await enablePushNotifications(user.uid);
            setPushMsg('Push notifications enabled.');
        } catch (e: unknown) {
            console.error(e);
            setPushMsg('Failed to enable push notifications.');
        } finally {
            setPushBusy(false);
        }
    }

    async function onTestPush() {
        if(!user) return;
        setPushBusy(true);
        setPushMsg(null);
        try {
            await sendBudgetAlert(user.uid, {
                title: 'Budget alert',
                body: 'You are close to your monthly budget.',
                url: '/app/dashboard',
            });
            setPushMsg('Test notification sent.');
        } catch (e: unknown) {
            console.error(e);
            setPushMsg('Failed to send test notification.');
        } finally {
            setPushBusy(false);
        }
    }

    useEffect(() => {
        if (!user) return;

        let cancelled = false;

        (async () => {
            try {
                setLoading(true);
                setError(null);

                //load categories once + month expenses (in parallel)
                const [cats, exps] = await Promise.all([
                    listCategories(user.uid),
                    listExpensesInMonth(user.uid, month),
                ]);

                if (cancelled) return;

                setCategories(cats);
                setExpenses(exps);
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
        for(const [categoryId, total] of acc.entries()) {
            result.push({
                categoryId,
                name: categoryMap.get(categoryId) ?? 'Unknown category',
                total,
            });
        }

        result.sort((a, b) => b.total - a.total);
        return result;
    }, [expenses, categoryMap]);

    return (
        <div>
            <h2>Dashboard</h2>

            <OfflineBanner />

            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <button onClick={onEnablePush} disabled={pushBusy}>
                    {pushBusy ? 'Working...' : 'Enable notifications'}
                </button>
                <button onClick={onTestPush} disabled={pushBusy}>
                    Send test notification
                </button>
            </div>
            {pushMsg && <p style={{ color: '#666' }}>{pushMsg}</p>}

            <div style={{ marginTop: 8 }}>
                <label>
                    Month{' '}
                    <input 
                        type="month" 
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        disabled={loading}
                    />
                </label>
            </div>

            {loading && <p style={{ color: '#666' }}>Loading...</p>}
            {error && <p style={{ color: 'crimson' }}>{error}</p>}

            {!loading && !error && (
                <>
                    <h3 style={{ marginTop: 16 }}>Monthly total</h3>
                    <p style={{ fontSize:20, marginTop: 6 }}>
                        {totalMonth.toFixed(2)}
                    </p>

                    <h3 style={{ marginTop: 16 }}>By category</h3>
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