//Auth Context (global user state)
import { onAuthStateChanged, type User } from "firebase/auth";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth } from "../../shared/firebase/auth";

type AuthState = {
    user: User | null;
    loading: boolean;
};

//Creates the context object as undefined
const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    // State to hold the current user and the initial loading flag
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        //Subscribes to Firebase auth state changes
        const unsub = onAuthStateChanged(auth, (u) => {
            setUser(u);
            setLoading(false);
        });
        return () => unsub();   //Unsubscribes from the listener when component unmounts
    }, []);

    //Caches the value object to prevent unnecessary re-renders
    const value = useMemo(() => ({ user, loading }), [user, loading]);

    //Provides the auth state to all child components
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

//Custom hook to access the auth context safely
export function useAuth() {
    const ctx = useContext(AuthContext);
    //Ensures the hook is called inside the Provider
    if(!ctx) throw new Error('useAuth must be inside AuthProvider');
    return ctx;
}
