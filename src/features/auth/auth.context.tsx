import { onAuthStateChanged, type User } from 'firebase/auth';
import React, { useEffect, useMemo, useState } from 'react';
import { auth } from '../../shared/firebase/auth';
import { AuthContext } from './auth-context';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  //subscribes to Firebase auth state changes
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { //callback function called on auth state change
      setUser(u);
      setLoading(false);
    }); 
    return () => unsub(); //cleanup function, unsubscribes from the listener when component unmounts
  }, []); //once when mounted

  //caches the value object to prevent unnecessary re-renders
  const value = useMemo(() => ({ user, loading }), [user, loading]);

  //provides the auth state to all child components
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
