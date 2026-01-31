//route layout
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../features/auth/auth.context";
import { logout } from "../../features/auth/auth.service";
import styles from "./AppShell.module.css";

//Navbar + User info + slot (<Outlet/>) where child pages render
const linkStyle = ({ isActive }: { isActive: boolean }) =>
    isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink;

export function AppLayout() {
    const { user } = useAuth(); //current authenticated user

    return (
        <div className={styles.page}>
            <div style={{ maxWidth: 1000, margin: "0 auto", padding: 24 }}>
                <header style={{ marginBottom: 16, display: "flex", justifyContent: "space-between" }}>
                    <div>
                        <h1 className={styles.h1}>Expense Tracker</h1>

                        <nav style={{ marginTop: 16 }}>
                            <NavLink to="/app/dashboard" className={linkStyle}>
                                Dashboard
                            </NavLink>
                            <NavLink to="/app/expenses" className={linkStyle}>
                                Expenses
                            </NavLink>
                            <NavLink to="/app/categories" className={linkStyle}>
                                Categories
                            </NavLink>
                            <NavLink to="/app/settings" className={linkStyle}>
                                Settings
                            </NavLink>
                        </nav>
                    </div>

                    <div style={{ textAlign: "right" }}>
                        <div className={styles.userEmail}>{user?.email}</div>
                        <button onClick={() => logout()} className={styles.btn} style={{ marginTop: 6, height: 32, padding: "0 12px" }}>
                            Logout
                        </button>
                    </div>
                </header>

                <main className={styles.hrTop}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
}