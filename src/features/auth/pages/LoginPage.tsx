//Login Page
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  signInEmail,
  signInGoogle,
  signUpEmail,
  sendResetEmail,
} from '../auth.service';
import styles from './LoginPage.module.css';

export function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function getErrorMessage(e: unknown, fallback: string) {
    if (e && typeof e === 'object' && 'message' in e) {
      const message = (e as { message?: unknown }).message;
      if (typeof message === 'string' && message.length > 0) return message;
    }
    return fallback;
  }

  async function handleEmail() {
    setError(null);
    setBusy(true);
    try {
      if (mode === 'login') await signInEmail(email, password);
      else await signUpEmail(email, password);
      nav('/app/dashboard', { replace: true });
    } catch (e: unknown) {
      setError(getErrorMessage(e, 'Auth error'));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setBusy(true);
    try {
      await signInGoogle();
      nav('/app/dashboard', { replace: true });
    } catch (e: unknown) {
      setError(getErrorMessage(e, 'Google Auth error'));
    } finally {
      setBusy(false);
    }
  }

  async function handleForgotPassword() {
    setError(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setError('Enter your email first.');
      return;
    }

    try {
      setBusy(true);
      await sendResetEmail(trimmed);
      setError(null);
      setMsg(
        'If an account exists for this email, a reset link has been sent.',
      );
    } catch {
      setError('Failed to send reset email.');
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleEmail();
  }

  return (
    <div className={styles.page}>
      <div className={styles.stack}>
        <h1 className={styles.appTitle}>Expense Tracker</h1>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.title}>
              {mode === 'login' ? 'Login' : 'Sign up'}
            </h2>
            <p className={styles.subtitle}>
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </p>
          </div>
          <form className={styles.form} onSubmit={handleSubmit}>
            <input
              className={styles.control}
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />

            <input
              className={styles.control}
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={
                mode === 'login' ? 'current-password' : 'new-password'
              }
            />

            <button
              className={styles.primaryBtn}
              type="submit"
              disabled={busy || !email || password.length < 6}
            >
              {busy ? '...' : mode === 'login' ? 'Login' : 'Create account'}
            </button>

            {mode === 'login' && (
              <button
                className={styles.ghostBtn} // or your styles.btn if you’re using AppShell styles
                type="button"
                onClick={handleForgotPassword}
                disabled={busy || !email}
              >
                Forgot password?
              </button>
            )}

            {msg && <p className={styles.muted}>{msg}</p>}

            <button
              className={styles.secondaryBtn}
              type="button"
              onClick={handleGoogle}
              disabled={busy}
            >
              Continue with Google
            </button>

            <button
              className={styles.ghostBtn}
              type="button"
              onClick={() => {
                setError(null);
                setMsg(null);
                setMode((m) => (m === 'login' ? 'signup' : 'login'));
              }}
              disabled={busy}
            >
              Switch to {mode === 'login' ? 'Sign up' : 'Login'}
            </button>

            {error && <p className={styles.error}>{error}</p>}

            <p className={styles.muted}>
              Note: password must contain at least 6 characters.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
