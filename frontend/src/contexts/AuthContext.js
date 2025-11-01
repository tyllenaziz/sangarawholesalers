import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';

// ✅ Use environment variable with fallback
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // ✅ Logout function
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }, []);

  // ✅ Load logged-in user profile from backend
  const loadUser = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      // ✅ Call /api/auth/profile
      const response = await axios.get(`${API_BASE_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setUser(response.data.data);
      } else {
        console.warn('Profile load failed:', response.data.message);
        logout();
      }
    } catch (error) {
      console.error('Failed to load user:', error.response?.data || error.message);
      logout();
    } finally {
      setLoading(false);
    }
  }, [token, logout]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // ✅ Login function
  const login = async (username, password) => {
    try {
      // ✅ Correct endpoint: /api/auth/login
      const response = await axios.post(`${API_BASE_URL}/auth/login`, { 
        username, 
        password 
      });

      if (response.data.success) {
        const { user, token } = response.data.data;
        localStorage.setItem('token', token);
        setToken(token);
        setUser(user);
        return { success: true, user };
      } else {
        return { success: false, message: response.data.message || 'Login failed' };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed. Please check your connection.';
      console.error('Login error:', error.response?.data || error.message);
      return { success: false, message };
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};