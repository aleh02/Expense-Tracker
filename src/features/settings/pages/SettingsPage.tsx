import { useEffect, useState } from "react";
import { useAuth } from "../../auth/auth.context";
import { enablePushNotifications, sendBudgetAlert } from "../../notifications/push.service";

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

    return (
        <div>
            <h2>Settings</h2>

            <p style={{ color: '#666', marginTop: 6 }}>
                Manage notification permissions and test push delivery.
            </p>

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                {pushEnabled ? (
                    <button onClick={onDisablePush} disabled={loading}>
                        {loading ? 'Working...' : 'Disable notifications'}
                    </button>
                ) : (
                    <button onClick={onEnablePush} disabled={loading}>
                        {loading ? 'Working...' : 'Enable notifications'}
                    </button>
                )}

                <button onClick={onSendTest} disabled={loading}>
                    {loading ? 'Working...' : 'Send test notification'}
                </button>
            </div>

            {msg && <p style={{ color: '#666', marginTop: 10 }}>{msg}</p>}

            {user?.email && (
                <p style={{ color: '#666', marginTop: 10 }}>
                    Signed in as: <strong>{user.email}</strong>
                </p>
            )}
        </div>
    );
}