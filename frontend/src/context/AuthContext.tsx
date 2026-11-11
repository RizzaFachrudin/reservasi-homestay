import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import axiosInstance from '../services/api.service';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'Admin' | 'Guest' | string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string, phone: string) => Promise<User>;
  logout: () => void;
  getProfile: () => Promise<void>;
}

const extractErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; errors?: Record<string, string> } | undefined;
    if (data?.errors && typeof data.errors === 'object') {
      const firstError = Object.values(data.errors)[0];
      if (firstError) return firstError;
    }
    if (data?.message) {
      return data.message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      // Verify token by fetching profile
      verifyToken(storedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const verifyToken = async (token: string) => {
    try {
      const response = await axiosInstance.get<{ success: boolean; data: User }>('/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.success) {
        setUser(response.data);
        setToken(token);
      } else {
        localStorage.removeItem('token');
        setToken(null);
      }
    } catch (error) {
      localStorage.removeItem('token');
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<User> => {
    try {
      const response = await axiosInstance.post<{ success: boolean; data: { user: User; token: string }; message?: string }>('/auth/login', { email, password });

      if (response.success) {
        const { user, token } = response.data;
        setUser(user);
        setToken(token);
        localStorage.setItem('token', token);
        return user;
      } else {
        throw new Error(response.message || 'Login gagal');
      }
    } catch (error) {
      throw new Error(extractErrorMessage(error, 'Login gagal'));
    }
  };

  const register = async (name: string, email: string, password: string, phone: string): Promise<User> => {
    try {
      const response = await axiosInstance.post<{ success: boolean; data: { user: User; token: string }; message?: string }>('/auth/register', {
        name,
        email,
        password,
        phone
      });

      if (response.success) {
        const { user, token } = response.data;
        setUser(user);
        setToken(token);
        localStorage.setItem('token', token);
        return user;
      } else {
        throw new Error(response.message || 'Registrasi gagal');
      }
    } catch (error) {
      throw new Error(extractErrorMessage(error, 'Registrasi gagal'));
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  const getProfile = async () => {
    if (!token) return;

    try {
      const response = await axiosInstance.get<{ success: boolean; data: User }>('/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.success) {
        setUser(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
    login,
    register,
    logout,
    getProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
