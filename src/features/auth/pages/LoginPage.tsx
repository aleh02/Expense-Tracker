//Login Page
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { signInEmail, signInGoogle, signUpEmail } from "../auth.service"

export function LoginPage() {
    const nav = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    async function handleEmail() {
        setError(null);
        setBusy(true);
        try {
            if (mode === 'login') await signInEmail(email, password);
            else await signUpEmail(email, password);
            nav('/app/dashboard', { replace: true });
        } catch (e: any) {
            setError(e?.message ?? 'Auth error');
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
        } catch (e: any) {
            setError(e?.message ?? 'Google Auth error');
        } finally {
            setBusy(false);
        }
    }

    return (
        <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', maxWidth: 420 }}>
            <h2>{mode === 'login' ? 'Login' : 'Sign up'}</h2>

            <div style={{ display: 'grid', gap: 8}}>
                <input 
                    placeholder="Email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                />
                <input 
                    placeholder="Password" 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />

                <button onClick={handleEmail} disabled={busy || !email || password.length < 6}>
                    {busy ? '...' : mode === 'login' ? 'Login' : 'Create account'}
                </button>
                
                <button onClick={handleGoogle} disabled={busy}>
                    Continue with Google
                </button>

                <button 
                    onClick={() => setMode((m) => (m === 'login' ? 'signup' : 'login'))} 
                    disabled={busy}
                    style={{ background: 'transparent', border: '1px solid #ddd' }}
                >
                    Switch to {mode === 'login' ? 'Sign up' : 'Login'}
                </button>

                {error && <p style={{ color: 'crimson' }}>{error}</p>}

                <p style={{ color: '#666', fontSize: 12 }}>
                    Note: password must contain at least 6 characters.
                </p>
            </div>
        </div>
    );
}