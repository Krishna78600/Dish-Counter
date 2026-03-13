"use client";
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChangedCallback } from '../../lib/firebase';
import { User } from 'firebase/auth';

type UserRole = 'admin' | 'employee' | null;

interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: UserRole;
  setRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  role: null,
  setRole: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRoleState] = useState<UserRole>(null);

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    if (newRole) {
      localStorage.setItem('userRole', newRole);
    } else {
      localStorage.removeItem('userRole');
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChangedCallback((user) => {
      setUser(user);
      if (user) {
        // Read role from localStorage when user is authenticated
        const savedRole = localStorage.getItem('userRole') as UserRole;
        setRoleState(savedRole);
      } else {
        setRoleState(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, role, setRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
