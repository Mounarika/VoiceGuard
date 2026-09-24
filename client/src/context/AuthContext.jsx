import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('vg_token') || null);
  const [demoCredentials, setDemoCredentials] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch pre-configured admin & demo user details
  useEffect(() => {
    fetch('/api/auth/demo-credentials')
      .then(res => res.json())
      .then(data => setDemoCredentials(data))
      .catch(err => console.error('Failed to load demo credentials:', err));
  }, []);

  // Validate existing token
  useEffect(() => {
    if (token) {
      fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => {
          if (res.ok) return res.json();
          throw new Error('Token expired');
        })
        .then(data => {
          setUser(data.user);
          setIsLoading(false);
        })
        .catch(() => {
          logout();
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Authentication failed');
    }

    localStorage.setItem('vg_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (email, password, full_name) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, full_name })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    localStorage.setItem('vg_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('vg_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      demoCredentials,
      isLoading,
      login,
      register,
      logout,
      isAdmin: user?.role === 'admin'
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
