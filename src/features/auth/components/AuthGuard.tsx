//Authentication Guard
import { Navigate } from 'react-router-dom';
import { useAuth } from '../useAuth';
import type React from 'react';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <p>Loading...</p>;
  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
