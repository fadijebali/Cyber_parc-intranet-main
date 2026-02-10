import React, { createContext, useContext, useState, ReactNode } from 'react';
import { apiFetch } from '@/lib/api';

export type UserRole = 'admin' | 'company' | null;

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyId?: string | number | null;
  companyName?: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getDisplayName = (email: string) => {
  const [namePart] = email.split('@');
  return namePart || email;
};

const isDemoAuthEnabled = () => {
  const flag = import.meta.env.VITE_DEMO_AUTH;
  return flag === undefined ? true : flag !== 'false';
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, password: string) => {
    try {
      const result = await apiFetch<{
        token: string;
        user: { id: string; email: string; role: UserRole; companyId?: string | number | null };
      }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      localStorage.setItem('authToken', result.token);

      setUser({
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
        companyId: result.user.companyId ?? null,
        name: getDisplayName(result.user.email),
        companyName: result.user.role === 'company' ? getDisplayName(result.user.email) : undefined,
      });
    } catch (error) {
      if (!isDemoAuthEnabled()) {
        throw error;
      }

      const demoRole: UserRole = 'company';
      localStorage.setItem('authToken', 'demo-token');
      setUser({
        id: `demo-${Date.now()}`,
        email,
        role: demoRole,
        companyId: demoRole === 'company' ? 'demo-company' : null,
        name: getDisplayName(email),
        companyName: demoRole === 'company' ? getDisplayName(email) : undefined,
      });
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
  };

  const switchRole = (role: UserRole) => {
    if (!role) {
      setUser(null);
      return;
    }

    if (!user) {
      return;
    }

    setUser({
      ...user,
      role,
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
