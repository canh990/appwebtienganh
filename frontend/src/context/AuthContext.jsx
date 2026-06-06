import { createContext, useState, useEffect, useContext } from 'react';
import { getProfile, refreshAccessToken } from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const token = localStorage.getItem('token');
      const refreshToken = localStorage.getItem('refreshToken');

      if (token && refreshToken) {
        try {
          const profileData = await getProfile();
          setUser(profileData);
          localStorage.setItem('user', JSON.stringify(profileData));
        } catch (error) {
          // If token expired, try to refresh
          try {
            const data = await refreshAccessToken(refreshToken);
            localStorage.setItem('token', data.token);
            if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
            
            const profileData = await getProfile();
            setUser(profileData);
          } catch (refreshErr) {
            console.error('Session expired. Logging out.');
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            setUser(null);
          }
        }
      }
      setLoading(false);
    };

    checkUser();
  }, []);

  const login = (userData, token, refreshToken) => {
    localStorage.setItem('token', token);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const updateUser = (updatedUser) => {
    const newUser = { ...user, ...updatedUser };
    localStorage.setItem('user', JSON.stringify(newUser));
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, updateUser }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
