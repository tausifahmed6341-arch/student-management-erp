import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, StudentProfile, Organization } from '../types';

interface AuthContextType {
  token: string | null;
  user: User | null;
  studentProfile: StudentProfile | null;
  organization: Organization | null;
  isLoading: boolean;
  login: (email: string, password?: string, org_id?: string) => Promise<boolean>;
  logout: () => void;
  quickSwitchUser: (demoUser: any) => Promise<void>;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isFaculty: boolean;
  isStudent: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(sessionStorage.getItem('erp_token'));
  const [user, setUser] = useState<User | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = async (authToken: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setStudentProfile(data.studentProfile || null);
        setOrganization(data.organization);
      } else {
        // Token invalid, clear
        sessionStorage.removeItem('erp_token');
        setToken(null);
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchCurrentUser(token);
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password = 'Password@123', org_id = 'org_apex'): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, org_id }),
      });

      if (res.ok) {
        const data = await res.json();
        sessionStorage.setItem('erp_token', data.token);
        setToken(data.token);
        setUser(data.user);
        setStudentProfile(data.studentProfile || null);
        setOrganization(data.organization);
        setIsLoading(false);
        return true;
      }
    } catch (err) {
      console.error('Login error:', err);
    }
    setIsLoading(false);
    return false;
  };

  const quickSwitchUser = async (demoUser: any) => {
    await login(demoUser.email, 'Password@123', demoUser.org_id);
  };

  const logout = () => {
    sessionStorage.removeItem('erp_token');
    setToken(null);
    setUser(null);
    setStudentProfile(null);
    setOrganization(null);
  };

  const refreshProfile = async () => {
    if (token) {
      await fetchCurrentUser(token);
    }
  };

  const isSuperAdmin = user?.role === 'super_admin';
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isFaculty = user?.role === 'faculty';
  const isStudent = user?.role === 'student';

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        studentProfile,
        organization,
        isLoading,
        login,
        logout,
        quickSwitchUser,
        isSuperAdmin,
        isAdmin,
        isFaculty,
        isStudent,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
