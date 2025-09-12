
"use client";

import {
  Auth,
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import { auth, googleProvider } from "@/lib/firebase";
import { StorageService } from "@/lib/storage-service";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  adminExists: boolean | null;
  login: (email: string, pass: string) => Promise<any>;
  loginWithGoogle: () => Promise<any>;
  signup: (email: string, pass: string, name?: string) => Promise<any>;
  logout: () => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminExists, setAdminExists] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAdminStatus = () => {
      // Direct check from localStorage.
      const adminFlag = localStorage.getItem('sativar-admin_exists');
      setAdminExists(adminFlag === 'true');
    };
    checkAdminStatus();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    
    // Listen for storage changes to keep adminExists in sync across tabs.
    const handleStorageChange = (event: StorageEvent) => {
        if (event.key === 'sativar-admin_exists') {
            checkAdminStatus();
        }
    };
    
    window.addEventListener('storage', handleStorageChange);

    return () => {
      unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const login = (email: string, pass: string) => {
    return signInWithEmailAndPassword(auth, email, pass);
  };
  
  const loginWithGoogle = () => {
    return signInWithPopup(auth, googleProvider);
  }

  const signup = async (email: string, pass: string, name?: string) => {
    if (adminExists) {
      throw new Error("Um administrador já existe.");
    }
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    if (userCredential.user) {
      if (name) {
        await updateProfile(userCredential.user, { displayName: name });
      }
      // Set admin flag
      localStorage.setItem('sativar-admin_exists', 'true');
      setAdminExists(true);
      setUser(auth.currentUser); // Update user state immediately after profile update
    }
    return userCredential;
  };

  const logout = () => {
    return signOut(auth);
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      adminExists,
      login,
      loginWithGoogle,
      signup,
      logout,
    }),
    [user, loading, adminExists]
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
