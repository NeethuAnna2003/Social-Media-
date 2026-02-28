import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Fetch user data
  const fetchUser = useCallback(async () => {
    console.log('[AuthContext] Fetching user profile...');
    try {
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await api.get('/accounts/profile/', {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      console.log('[AuthContext] User profile fetched successfully:', response.data);
      setUser(response.data.user || response.data);
      setError(null);
      return { success: true };
    } catch (err) {
      console.error('[AuthContext] Failed to fetch user:', err);

      // Clear tokens on any authentication error
      if (err.response?.status === 401 || err.response?.status === 404 || err.name === 'AbortError') {
        console.warn('[AuthContext] Authentication failed, clearing tokens');
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        setUser(null);
      }

      return { success: false, error: 'Failed to fetch user data' };
    } finally {
      console.log('[AuthContext] Setting loading to false and initialized to true');
      setLoading(false);
      setInitialized(true);
    }
  }, []);

  // Login function
  const login = async (username, password) => {
    try {
      setLoading(true);
      // Use SimpleJWT token endpoint
      // Note: Assuming baseURL is /api, so this becomes /api/token/
      const response = await api.post('/token/', { username, password });
      const { access, refresh } = response.data;

      if (!access) {
        throw new Error('No authentication token received');
      }

      localStorage.setItem('access', access);
      if (refresh) {
        localStorage.setItem('refresh', refresh);
      }

      // Fetch user data after successful login
      const userRes = await fetchUser();
      if (!userRes.success) {
        throw new Error('Failed to load user profile after login');
      }

      setError(null);
      return { success: true };
    } catch (err) {
      console.error('Login error:', err);
      const errorMessage = err.response?.data?.message || err.response?.data?.detail || 'Login failed. Please try again.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      setLoading(true);
      await api.post('/accounts/register/', userData);
      return { success: true };
    } catch (err) {
      console.error('Registration error:', err);
      let errorMessage = 'Registration failed. Please try again.';

      if (err.response?.data) {
        const data = err.response.data;
        if (Array.isArray(data)) {
          errorMessage = data[0];
        } else if (typeof data === 'object') {
          // Check for common field errors
          if (data.username) errorMessage = `Username: ${data.username[0]}`;
          else if (data.email) errorMessage = `Email: ${data.email[0]}`;
          else if (data.password) errorMessage = `Password: ${data.password[0]}`;
          else if (data.detail) errorMessage = data.detail;
          else {
            const messages = Object.values(data).flat();
            if (messages.length > 0) errorMessage = messages[0];
          }
        }
      }

      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    setUser(null);
    setError(null);
    navigate('/login');
    return { success: true };
  };

  // Check authentication status on mount
  useEffect(() => {
    console.log('[AuthContext] Initializing auth state...');
    const token = localStorage.getItem('access');
    console.log('[AuthContext] Token found:', !!token);

    if (token) {
      console.log('[AuthContext] Token exists, fetching user profile');
      fetchUser();
    } else {
      console.log('[AuthContext] No token found, user must login');
      // No token = not authenticated, user must login
      setUser(null);
      setLoading(false);
      setInitialized(true);
    }
  }, [fetchUser]);

  const value = {
    user,
    isAuthenticated: !!user,
    loading: loading || !initialized,
    error,
    login,
    register,
    logout,
    fetchUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && initialized ? children : (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#f9fafb'
        }}>
          <div style={{
            width: '3rem',
            height: '3rem',
            borderRadius: '50%',
            border: '4px solid #e5e7eb',
            borderTopColor: '#3b82f6',
            animation: 'spin 1s linear infinite'
          }}></div>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
