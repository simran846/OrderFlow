'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserSummary } from '@/types';
import { ApiClient } from '../lib/api';

interface AuthContextType {
  user: UserSummary | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; firstName: string; lastName: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const cached = ApiClient.getCurrentUser();
      if (cached) setUser(cached);

      if (ApiClient.isAuthenticated()) {
        try {
          const fresh = await ApiClient.getMe();
          if (fresh) setUser(fresh);
        } catch {
          // Token expired or invalid
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();

    const handleLogin = (e: any) => setUser(e.detail);
    const handleLogout = () => setUser(null);

    window.addEventListener('auth:login', handleLogin);
    window.addEventListener('auth:logout', handleLogout);
    window.addEventListener('auth:expired', handleLogout);

    return () => {
      window.removeEventListener('auth:login', handleLogin);
      window.removeEventListener('auth:logout', handleLogout);
      window.removeEventListener('auth:expired', handleLogout);
    };
  }, []);

  const login = async (email: string, password: string) => {
    const data = await ApiClient.login({ email, password });
    setUser(data.user);
  };

  const register = async (data: { email: string; password: string; firstName: string; lastName: string }) => {
    const res = await ApiClient.register(data);
    setUser(res.user);
  };

  const logout = () => {
    ApiClient.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
