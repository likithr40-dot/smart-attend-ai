import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { apiRequest, getStoredToken, setStoredToken } from '../services/api';
import {
  auth,
  signInWithGoogleFirebase,
  signOutGoogleFirebase,
} from '../services/firebase';
import type { AuthUser, UserRole } from '../types';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  firebaseUser: FirebaseUser | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (payload: {
    name: string;
    email: string;
    password: string;
    department: string;
    semester: number;
  }) => Promise<AuthUser>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  connectCloudSync: () => Promise<FirebaseUser>;
  disconnectCloudSync: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function getDashboardPathForRole(role: UserRole): string {
  if (role === 'admin') return '/admin';
  if (role === 'faculty') return '/faculty';
  return '/student';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);

  const refreshUser = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await apiRequest<{ user: AuthUser }>('/api/auth/me');
      setUser(res.user);
    } catch {
      setStoredToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      setFirebaseUser(fbUser);
    });
    return () => unsub();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const res = await apiRequest<{ token: string; user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setStoredToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const register = async (payload: {
    name: string;
    email: string;
    password: string;
    department: string;
    semester: number;
  }) => {
    const res = await apiRequest<{ token: string; user: AuthUser }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setStoredToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    setStoredToken(null);
    setUser(null);
  };

  const connectCloudSync = async () => {
    return await signInWithGoogleFirebase();
  };

  const disconnectCloudSync = async () => {
    await signOutGoogleFirebase();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        firebaseUser,
        login,
        register,
        logout,
        refreshUser,
        connectCloudSync,
        disconnectCloudSync,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
