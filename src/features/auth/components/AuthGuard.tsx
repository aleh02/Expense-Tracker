import type React from "react";
import { Navigate } from "react-router-dom";

type Props = {
    children: React.ReactNode;
};

export function AuthGuard({ children }: Props) {
    //Auth (user check with Firebase)
    const isLoggedIn = true;

    if(!isLoggedIn) return <Navigate to="/login" replace />;

    return <>{children}</>;
}