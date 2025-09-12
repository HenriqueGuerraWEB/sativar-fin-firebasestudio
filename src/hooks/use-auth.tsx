
"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import { StorageService } from "@/lib/storage-service";

// Define a simple user object type for our custom auth
type User = {
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// The key for storing the currently logged-in user session
const SESSION_STORAGE_KEY = 'sativar-session';
// The key for storing the list of all users (in this case, just the admin)
const USERS_STORAGE_KEY = 'sativar-users';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminExists, setAdminExists] = useState<boolean | null>(null);

  useEffect(() => {
    const initializeAuth = async () => {
        try {
        // Check if an admin account exists
        const users = await StorageService.getCollection(USERS_STORAGE_KEY);
        setAdminExists(users.length > 0);

        // Check for an active session
        const sessionUserJson = localStorage.getItem(SESSION_STORAGE_KEY);
        if (sessionUserJson) {
            setUser(JSON.parse(sessionUserJson));
        }
        } catch (e) {
            console.error("Failed to initialize auth state from storage", e);
        } finally {
            setLoading(false);
        }
    };

    initializeAuth();

    const handleStorageChange = async (event: StorageEvent) => {
        if (event.key === USERS_STORAGE_KEY) {
            const users = await StorageService.getCollection(USERS_STORAGE_KEY);
            setAdminExists(users.length > 0);
        }
        if (event.key === SESSION_STORAGE_KEY) {
            const sessionUserJson = event.newValue;
            if (sessionUserJson) {
                setUser(JSON.parse(sessionUserJson));
            } else {
                setUser(null);
            }
        }
    };
    
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const login = useCallback(async (email: string, pass: string): Promise<void> => {
    const users = await StorageService.getCollection(USERS_STORAGE_KEY);
    const userToLogin = users.find(
      (u: any) => u.email === email && u.password === pass // Plain text comparison
    );

    if (userToLogin) {
      const userData: User = { name: userToLogin.name, email: userToLogin.email };
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(userData));
      setUser(userData);
    } else {
      throw new Error("Credenciais inválidas. Verifique seu e-mail e senha.");
    }
  }, []);

  const signup = useCallback(async (email: string, pass: string, name: string): Promise<void> => {
    const users = await StorageService.getCollection(USERS_STORAGE_KEY);
    if (users.length > 0) {
      throw new Error("Um administrador já existe. Não é possível criar outra conta.");
    }

    if (!name || !email || !pass) {
        throw new Error("Nome, email e senha são obrigatórios.");
    }

    const newUser = { name, email, password: pass }; // Storing password in plain text
    await StorageService.addItem(USERS_STORAGE_KEY, newUser);

    const userData: User = { name, email };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(userData));
    setUser(userData);
    setAdminExists(true);
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      adminExists,
      login,
      signup,
      logout,
    }),
    [user, loading, adminExists, login, signup, logout]
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
