'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';
import { apiRequest, setAuthToken, removeAuthToken } from '../lib/api';

interface AuthContextType {
  user: User | null;
  role: Role;
  isLoading: boolean;
  isAdmin: boolean;
  isSupervisor: boolean;
  isEmployee: boolean;
  login: (email: string, passwordPlain: string) => Promise<boolean>;
  logout: () => void;
  switchRole: (newRole: Role, employeeId?: string, name?: string) => void;
}

const defaultAdminUser: User = {
  id: 'USR-001',
  email: 'admin@payroll.corp',
  role: 'ADMIN',
  name: 'System Administrator',
  department: 'Executive Administration',
  isActive: true,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(defaultAdminUser);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    // Attempt auto-login or read from localStorage if present
    const savedUser = localStorage.getItem('payroll_demo_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        setUser(defaultAdminUser);
      }
    }
  }, []);

  const login = async (email: string, passwordPlain: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password: passwordPlain }),
      });

      if (res.success && res.data) {
        setAuthToken(res.data.token);
        setUser(res.data.user);
        localStorage.setItem('payroll_demo_user', JSON.stringify(res.data.user));
        setIsLoading(false);
        return true;
      }
      setIsLoading(false);
      return false;
    } catch {
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    removeAuthToken();
    localStorage.removeItem('payroll_demo_user');
    setUser(null);
  };

  const switchRole = (newRole: Role, employeeId = 'EMP-001', name = 'Juan Dela Cruz') => {
    let switched: User;
    if (newRole === 'ADMIN') {
      switched = defaultAdminUser;
    } else if (newRole === 'SUPERVISOR') {
      switched = {
        id: 'USR-003',
        email: 'maria.santos@payroll.corp',
        role: 'SUPERVISOR',
        employeeId: 'EMP-002',
        name: 'Maria Santos',
        department: 'Finance',
        isActive: true,
      };
    } else {
      switched = {
        id: 'USR-002',
        email: 'juan.delacruz@payroll.corp',
        role: 'EMPLOYEE',
        employeeId,
        name,
        department: 'Human Resources',
        isActive: true,
      };
    }
    setUser(switched);
    localStorage.setItem('payroll_demo_user', JSON.stringify(switched));
  };

  const role = user?.role || 'ADMIN';
  const isAdmin = role === 'ADMIN';
  const isSupervisor = role === 'SUPERVISOR';
  const isEmployee = role === 'EMPLOYEE';

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isLoading,
        isAdmin,
        isSupervisor,
        isEmployee,
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
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
