import React, { createContext, useContext, useState, useEffect } from 'react';
import axiosInstance from '../services/api.service';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, phone: string) => Promise<void>;
  logout: () => void;
  getProfile: () => Promise<void>;
}

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

  const login = async (email: string, password: string) => {
    try {
      const response = await axiosInstance.post<{ success: boolean; data: { user: User; token: string }; message?: string }>('/auth/login', { email, password });

      if (response.success) {
        const { user, token } = response.data;
        setUser(user);
        setToken(token);
        localStorage.setItem('token', token);
      } else {
        throw new Error(response.message || 'Login gagal');
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Login gagal');
    }
  };

  const register = async (name: string, email: string, password: string, phone: string) => {
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
      } else {
        throw new Error(response.message || 'Registrasi gagal');
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Registrasi gagal');
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
