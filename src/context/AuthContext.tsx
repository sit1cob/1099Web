import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ApiService, { setLogoutCallback } from '../api/apiService';
import { trackLogin, trackLogout, identifySession } from '../utils/clarityTracking';
import { UserDto } from '../types/auth.types';

interface AuthContextType {
  user: UserDto | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const logout = useCallback(() => {
    trackLogout();
    ApiService.logout();
    setUser(null);
    navigate('/login');
  }, [navigate]);

  useEffect(() => {
    setLogoutCallback(logout);
    const stored = ApiService.getUser();
    const token = ApiService.getToken();
    if (stored && token) {
      setUser(stored);
      // Re-identify returning user in Clarity on page reload
      identifySession();
    }
    setIsLoading(false);
  }, [logout]);

  const login = async (username: string, password: string) => {
    const response = await ApiService.login({
      username: username.trim(),
      password: password.trim(),
      role: 'registered_user',
      fcmToken: '',
    });

    if (response.success) {
      ApiService.saveAuthData(response);
      const u = response.data?.user || response.user || null;
      setUser(u);
      // Merge top-level response data with user object so all fields are tracked
      const fullUserData = { ...(response.data || {}), ...u };
      trackLogin(username.trim(), fullUserData);
      navigate('/');
    } else {
      throw new Error(response.message || 'Login failed');
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
