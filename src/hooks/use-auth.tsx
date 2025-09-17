
"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import { LocalStorageService } from "@/lib/storage-service";
import { adminExists as adminExistsFlow, createAdmin, getUser } from "@/ai/flows/users-flow";

const isDbEnabled = process.env.NEXT_PUBLIC_DATABASE_ENABLED === 'true';

// Define a user object type that includes the ID from the database
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

const SESSION_STORAGE_KEY = 'sativar-session';
const USERS_STORAGE_KEY = 'sativar-users'; // Used only for localStorage mode

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminExists, setAdminExists] = useState<boolean | null>(null);

  const checkAdminExists = useCallback(async () => {
    if (isDbEnabled) {
      return await adminExistsFlow();
    } else {
      const users = LocalStorageService.getCollection(USERS_STORAGE_KEY);
      return users.length > 0;
    }
  }, []);
  
  const initializeAuth = useCallback(async () => {
    try {
      setAdminExists(await checkAdminExists());
      const sessionUserJson = localStorage.getItem(SESSION_STORAGE_KEY);
      if (sessionUserJson) {
        setUser(JSON.parse(sessionUserJson));
      }
    } catch (e) {
      console.error("Failed to initialize auth state", e);
    } finally {
      setLoading(false);
    }
  }, [checkAdminExists]);


  useEffect(() => {
    initializeAuth();
    // No need for storage event listener, as session is the single source of truth for UI
  }, [initializeAuth]);

  const login = useCallback(async (email: string, pass: string): Promise<void> => {
    let userData: Omit<User, 'password'> | null = null;

    if (isDbEnabled) {
        userData = await getUser({ email, password });
    } else {
        const users = LocalStorageService.getCollection(USERS_STORAGE_KEY);
        const userToLogin = users.find(
            (u: any) => u.email === email && u.password === pass
        );
        if (userToLogin) {
            const { password, ...rest } = userToLogin;
            userData = rest;
        }
    }

    if (userData) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(userData));
      setUser(userData as User);
    } else {
      throw new Error("Credenciais inválidas. Verifique seu e-mail e senha.");
    }
  }, []);

  const signup = useCallback(async (email: string, pass: string, name: string): Promise<void> => {
      const exists = await checkAdminExists();
      if (exists) {
          throw new Error("Um administrador já existe. Não é possível criar outra conta.");
      }
      if (!name || !email || !pass) {
          throw new Error("Nome, email e senha são obrigatórios.");
      }

      let newUserData: Omit<User, 'password'>;
      if (isDbEnabled) {
          newUserData = await createAdmin({ name, email, password: pass });
      } else {
          const newUser = LocalStorageService.addItem(USERS_STORAGE_KEY, { name, email, password: pass });
          const { password, ...rest } = newUser;
          newUserData = rest;
      }
      
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newUserData));
      setUser(newUserData as User);
      setAdminExists(true);
  }, [checkAdminExists]);

  const logout = useCallback(async (): Promise<void> => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setUser(null);
  }, []);
  
  const refreshUser = useCallback(async (): Promise<void> => {
     const sessionUserJson = localStorage.getItem(SESSION_STORAGE_KEY);
     if (sessionUserJson) {
        const sessionUser = JSON.parse(sessionUserJson) as User;
        // In DB mode, we could re-fetch from DB to ensure data is fresh
        // For now, just re-setting from localStorage is enough after an update.
        setUser(sessionUser);
     }
  }, []);


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
