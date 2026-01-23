import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../features/auth/auth.context";
import { logout } from "../../features/auth/auth.service";

const linkStyle = ({ isActive }: { isActive: boolean }) => ({
    marginRight: 12,
    textDecoration: 'none',
    fontWeight: isActive ? 700 : 400,
});

export function AppLayout() {
    const { user } = useAuth();

    return (
        <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
            <header style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                <div>
                    <h1 style={{ margin: 0 }}>Expense Tracker</h1>
                    <nav style={{ marginTop: 8 }}>
                        <NavLink to="/app/dashboard" style={linkStyle}>
                            Dashboard
                        </NavLink>
                        <NavLink to="/app/expenses" style={linkStyle}>
                            Expenses
                        </NavLink>
                        <NavLink to="/app/categories" style={linkStyle}>
                            Categories
                        </NavLink>
                    </nav>
                </div>

                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, color: '#666' }}>{user?.email}</div>
                    <button onClick={() => logout()} style={{ marginTop: 6 }}>
                        Logout
                    </button>
                </div>
            </header>

            <main style={{ borderTop: '1px solid #ddd', paddingTop: 16 }}>
                <Outlet />
            </main>
        </div>
    )
}