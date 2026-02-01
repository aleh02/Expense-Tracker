import React, { useEffect, useState } from "react";
import { useAuth } from "../../auth/auth.context";
import { enablePushNotifications, sendBudgetAlert } from "../../notifications/push.service";
import { getProfile, setBaseCurrency } from "../profile.service";
import { updatePassword } from "firebase/auth";
import styles from "../../../app/layouts/AppShell.module.css";
import pkg from "../../../../package.json";

const APP_VERSION = pkg.version;

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

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [pwMsg, setPwMsg] = useState<string | null>(null);
    const [pwErr, setPwErr] = useState<string | null>(null);

    const isGoogleUser = user?.providerData?.some(p => p.providerId === "google.com") ?? false;
    const isPasswordUser = user?.providerData?.some(p => p.providerId === "password") ?? false;


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

    async function onChangePassword() {
        setPwErr(null);
        setPwMsg(null);

        if (!user) return setPwErr("You must be signed in.");

        if (newPassword.length < 6) return setPwErr("Password must be at least 6 characters.");
        if (newPassword !== confirmPassword) return setPwErr("Passwords do not match.");

        try {
            setLoading(true);
            await updatePassword(user, newPassword);
            setPwMsg("Password updated.");
            setNewPassword("");
            setConfirmPassword("");
        } catch (e: any) {
            if (e?.code === "auth/requires-recent-login") {
                setPwErr("Please log in again, then retry changing your password.");
            } else {
                setPwErr("Failed to update password.");
            }
        } finally {
            setLoading(false);
        }
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        onSaveCurrency();
    }

    return (
        <div style={{ marginTop: -18, maxWidth: 1100, padding: "24px 16px" }}>
            <h2 style={{ margin: 0, fontWeight: 800 }}>Settings</h2>

            <p className={styles.muted}>
                Manage currency, notification permissions and test push delivery.
            </p>

            <div
                className={styles.card}
                style={{
                    marginTop: 14,
                    padding: 14,
                    borderRadius: 14,
                    maxWidth: 700,
                }}
            >
                <h3 style={{ marginTop: 0 }}>Currency</h3>

                <form onSubmit={handleSubmit} style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12 }}>
                    <select
                        className={styles.input}
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
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                onSaveCurrency();
                            }
                        }}
                    >
                        <option value="EUR">EUR</option>
                        <option value="USD">USD</option>
                        <option value="GBP">GBP</option>
                        <option value="CNY">CNY</option>
                        <option value="JPY">JPY</option>
                    </select>

                    <button
                        className={`${styles.btn} ${styles.btnPrimary}`}
                        type="submit"
                        disabled={loading}
                        style={{ height: 36, padding: "0 14px", borderRadius: 10 }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                onSaveCurrency();
                            }
                        }}
                    >
                        {loading ? "Working..." : "Save"}
                    </button>
                </form>
            </div>

            <div
                className={styles.card}
                style={{
                    marginTop: 20,
                    padding: 14,
                    borderRadius: 14,
                    maxWidth: 700,
                }}
            >
                <h3 style={{ marginTop: 0 }}>Notifications</h3>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10, marginBottom: 4 }}>
                    {pushEnabled ? (
                        <button
                            className={styles.btn}
                            onClick={onDisablePush}
                            disabled={loading}
                            style={{ height: 36, padding: "0 14px", borderRadius: 10 }}
                        >
                            {loading ? "Working..." : "Disable notifications"}
                        </button>
                    ) : (
                        <button
                            className={styles.btn}
                            onClick={onEnablePush}
                            disabled={loading}
                            style={{ height: 36, padding: "0 14px", borderRadius: 10 }}
                        >
                            {loading ? "Working..." : "Enable notifications"}
                        </button>
                    )}

                    <button
                        className={styles.btn}
                        onClick={onSendTest}
                        disabled={loading}
                        style={{ height: 36, padding: "0 14px", borderRadius: 10 }}
                    >
                        {loading ? "Working..." : "Send test notification"}
                    </button>
                </div>
            </div>

            {isPasswordUser ? (
                <div className={styles.card} style={{ marginTop: 20, padding: 14, borderRadius: 14, maxWidth: 700 }}>
                    <h3 style={{ marginTop: 0 }}>Change password</h3>

                    <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                        <input
                            className={styles.input}
                            type="password"
                            placeholder="New password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            disabled={loading}
                            style={{ height: 32, padding: "4px 10px", borderRadius: 10 }}
                        />

                        <input
                            className={styles.input}
                            type="password"
                            placeholder="Confirm new password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            disabled={loading}
                            style={{ height: 32, padding: "4px 10px", borderRadius: 10 }}
                        />

                        <div style={{ marginTop: 6, display: "flex", justifyContent: "flex-end" }}>
                            <button
                                className={`${styles.btn} ${styles.btnPrimary}`}
                                onClick={onChangePassword}
                                disabled={loading}
                                style={{ height: 36, padding: "0 14px", borderRadius: 10 }}
                            >
                                {loading ? "Working..." : "Update password"}
                            </button>
                        </div>

                        {pwErr && <p className={styles.danger} style={{ margin: 0 }}>{pwErr}</p>}
                        {pwMsg && <p className={styles.muted} style={{ margin: 0 }}>{pwMsg}</p>}
                    </div>
                </div>
            ) : isGoogleUser ? (
                <p className={styles.muted} style={{ marginTop: 20, marginLeft: 1 }}>
                    Password is managed by Google for this account.
                </p>
            ) : null}


            {user?.email && (
                <p className={styles.muted} style={{ marginTop: 20, marginLeft: 1 }}>
                    Signed in as: <strong style={{ color: "rgba(233,233,234,0.85)" }}>{user.email}</strong>
                </p>
            )}

            {msg && (
                <p className={styles.muted} style={{ color: "#ff6b6b", marginTop: 20 }}>
                    {msg}
                </p>
            )}

            <p className={styles.muted} style={{ marginTop: 20 }}>
                Version: <strong style={{ color: "rgba(233,233,234,0.85)" }}>v{APP_VERSION}</strong>
            </p>
        </div>
    );
}