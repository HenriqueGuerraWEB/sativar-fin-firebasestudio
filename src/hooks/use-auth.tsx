
"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import { adminExists as adminExistsFlow } from "@/ai/flows/users-flow";

export type User = {
  id: string;
  name: string;
  email: string;
};

interface AuthContextType {
  user: User | null;
  loading: boolean;
  adminExists: boolean | null;
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminExists, setAdminExists] = useState<boolean | null>(null);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session');
      if (res.ok) {
        const { user: sessionUser } = await res.json();
        setUser(sessionUser);
      } else {
        setUser(null);
      }
    } catch (e) {
      console.error("Failed to fetch session", e);
      setUser(null);
    }
  }, []);

  const initializeAuth = useCallback(async () => {
    setLoading(true);
    try {
      const exists = await adminExistsFlow();
      setAdminExists(exists);
      if (exists) {
        await fetchSession();
      }
    } catch (e) {
      console.error("Failed to initialize auth state", e);
    } finally {
      setLoading(false);
    }
  }, [fetchSession]);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const login = useCallback(async (email: string, pass: string): Promise<void> => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass }),
    });

    if (res.ok) {
      const { user: loggedInUser } = await res.json();
      setUser(loggedInUser);
    } else {
      const { error } = await res.json();
      throw new Error(error || "Falha no login");
    }
  }, []);

  const signup = useCallback(async (email: string, pass: string, name: string): Promise<void> => {
    const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass, name }),
    });
    
    if (res.ok) {
        const { user: signedUpUser } = await res.json();
        setUser(signedUpUser);
        setAdminExists(true);
    } else {
        const { error } = await res.json();
        throw new Error(error || "Falha no cadastro");
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  }, []);
  
  const refreshUser = useCallback(async (): Promise<void> => {
     await fetchSession();
  }, [fetchSession]);


  const value = useMemo(
    () => ({
      user,
      loading,
      adminExists,
      login,
      signup,
      logout,
      refreshUser,
    }),
    [user, loading, adminExists, login, signup, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
