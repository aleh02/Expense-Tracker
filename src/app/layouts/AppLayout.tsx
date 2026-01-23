import { NavLink, Outlet } from "react-router-dom";

const linkStyle = ({ isActive }: { isActive: boolean }) => ({
    marginRight: 12,
    textDecoration: 'none',
    fontWeight: isActive ? 700 : 400,
});

export function AppLayout() {
    return (
        <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
            <header style={{ marginBottom: 16 }}>
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
            </header>

            <main style={{ borderTop: '1px solid #ddd', paddingTop: 16 }}>
                <Outlet />
            </main>
        </div>
    )
}