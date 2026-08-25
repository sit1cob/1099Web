import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ApiService, { setLogoutCallback } from '../api/apiService';
import { trackLogin, trackLogout, identifySession } from '../utils/clarityTracking';
import { ga4Login, ga4LoginFailed, ga4Logout, ga4SessionRestored } from '../utils/ga4DataLayer';
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
  const sessionRestoredFired = useRef(false);

  const logout = useCallback(() => {
    trackLogout();
    ga4Logout();
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
      // Fire session_restored only once per app lifecycle (not on in-app navigation)
      if (!sessionRestoredFired.current) {
        identifySession();
        ga4SessionRestored(stored.username || stored.vendorName || '');
        sessionRestoredFired.current = true;
      }
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
      ga4Login(username.trim(), fullUserData);
      navigate('/');
    } else {
      ga4LoginFailed(username.trim(), response.message || 'Login failed');
      throw new Error(response.message || 'Login failed');
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
