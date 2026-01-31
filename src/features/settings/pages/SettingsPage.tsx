import { useEffect, useState } from "react";
import { useAuth } from "../../auth/auth.context";
import { enablePushNotifications, sendBudgetAlert } from "../../notifications/push.service";
import { getProfile, setBaseCurrency } from "../profile.service";

async function getCurrentSubscription(): Promise<PushSubscription | null> {
    if (!('serviceWorker' in navigator)) return null;
    const reg = await navigator.serviceWorker.ready;
    return reg.pushManager.getSubscription();
}

export function SettingsPage() {
    const { user } = useAuth();

    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);
    const [pushEnabled, setPushEnabled] = useState(false);

    const [baseCurrency, setBaseCurrencyState] = useState('EUR');

    //detects current push state
    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const sub = await getCurrentSubscription();
                if (!cancelled) setPushEnabled(!!sub);   //!!sub = true if subscribed, false if null
            } catch (e: unknown) {
                console.warn(e);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    //loads base currency
    useEffect(() => {
        if (!user) return;
        (async () => {
            const p = await getProfile(user.uid);
            setBaseCurrencyState(p.baseCurrency);
        })();
    }, [user?.uid]);

    async function onEnablePush() {
        if (!user) return;

        setLoading(true);
        setMsg(null);

        try {
            await enablePushNotifications(user.uid);
            setPushEnabled(true);
            setMsg('Push notifications enabled.');
        } catch (e: unknown) {
            console.error(e);
            setMsg('Failed to enable push notifications.');
        } finally {
            setLoading(false);
        }
    }

    async function onDisablePush() {
        setLoading(true);
        setMsg(null);

        try {
            const sub = await getCurrentSubscription();
            if (sub) {
                await sub.unsubscribe(); //removes sub from this browser
            }
            setPushEnabled(false);
            setMsg('Push notifications disabled.');
        } catch (e: unknown) {
            console.error(e);
            setMsg('Failed to disable push notifications.');
        } finally {
            setLoading(false);
        }
    }

    async function onSendTest() {
        if (!user) return;

        setLoading(true);
        setMsg(null);

        try {
            await sendBudgetAlert(user.uid, {
                title: 'Test notification',
                body: 'This is a test push notification from the server.',
                url: '/app/dashboard',
            });
            setMsg('Test notification sent.');
        } catch (e: unknown) {
            console.error(e);
            setMsg('Failed to send test notification.');
        } finally {
            setLoading(false);
        }
    }

    async function onSaveCurrency() {
        if (!user) return;
        setLoading(true);
        setMsg(null);
        try {
            await setBaseCurrency(user.uid, baseCurrency);
            setMsg('Base currency saved.');
        } catch (e: unknown) {
            console.error(e);
            setMsg('Failed to save base currency.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{ marginTop: -18, maxWidth: 1100, padding: "24px 16px" }}>
            <h2>Settings</h2>

            <p style={{ color: "#888", marginTop: -4 }}>
                Manage currency, notification permissions and test push delivery.
            </p>

            <div
                style={{
                    marginTop: 14,
                    padding: 14,
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 14,
                    background: "rgba(255,255,255,0.03)",
                    maxWidth: 700,
                }}
            >
                <h3 style={{ marginTop: 0 }}>Currency</h3>

                <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12 }}>
                    <select
                        value={baseCurrency}
                        onChange={(e) => setBaseCurrencyState(e.target.value)}
                        disabled={loading}
                        style={{
                            flex: 1,
                            minWidth: 0,
                            height: 32,
                            padding: "4px 10px",
                            borderRadius: 10,
                            boxSizing: "border-box",
                        }}
                    >
                        <option value="EUR">EUR</option>
                        <option value="USD">USD</option>
                        <option value="GBP">GBP</option>
                        <option value="CNY">CNY</option>
                        <option value="JPY">JPY</option>
                    </select>

                    <button onClick={onSaveCurrency} disabled={loading} style={{ height: 36 }}>
                        {loading ? "Working..." : "Save"}
                    </button>
                </div>
            </div>

            <div
                style={{
                    marginTop: 20,
                    padding: 14,
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 14,
                    background: "rgba(255,255,255,0.03)",
                    maxWidth: 700,
                }}
            >
                <h3 style={{ marginTop: 0 }}>Notifications</h3>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10, marginBottom: 4 }}>
                    {pushEnabled ? (
                        <button onClick={onDisablePush} disabled={loading} style={{ height: 36 }}>
                            {loading ? "Working..." : "Disable notifications"}
                        </button>
                    ) : (
                        <button onClick={onEnablePush} disabled={loading} style={{ height: 36 }}>
                            {loading ? "Working..." : "Enable notifications"}
                        </button>
                    )}

                    <button onClick={onSendTest} disabled={loading} style={{ height: 36 }}>
                        {loading ? "Working..." : "Send test notification"}
                    </button>
                </div>

                {msg && <p style={{ color: "#666", marginTop: 12, marginBottom: 0, marginLeft: 6 }}>{msg}</p>}
            </div>

            {user?.email && (
                <p style={{ color: "#666", marginTop: 20, marginLeft: 1 }}>
                    Signed in as: <strong>{user.email}</strong>
                </p>
            )}

        </div>
    );
}