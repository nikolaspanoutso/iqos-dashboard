"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'admin' | 'activator' | 'specialist';

export interface User {
  id: string;
  name: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  login: (userId: string) => void;
  logout: () => void;
  users: User[];
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const USERS: User[] = [
  // Fallback initial users if API fails or is empty
  { id: 'admin', name: 'Admin (Team Leader)', role: 'admin' },
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch users from DB
    async function fetchUsers() {
      try {
        const res = await fetch('/api/users');
        const data = await res.json();
        let finalUsers: User[] = [];
        if (Array.isArray(data) && data.length > 0) {
            finalUsers = data;
        } else {
             // If DB is empty, use seed-like fallback for demo
             finalUsers = [
                { id: 'admin', name: 'Admin (Team Leader)', role: 'admin' },
                { id: 'spec1', name: 'Maria Tasiou', role: 'specialist' },
                { id: 'spec2', name: 'Nikos Mousas', role: 'specialist' },
                { id: 'spec3', name: 'Giwrgos Grimanis', role: 'specialist' },
                { id: 'spec4', name: 'Nikolas Panoutsopoulos', role: 'specialist' },
                { id: 'spec5', name: 'Nefeli Merko', role: 'specialist' },
             ];
        }
        setUsersList(finalUsers);

        // PERSISTENCE: Check if we have a saved user
        if (typeof window !== 'undefined') {
          const savedUserId = localStorage.getItem('currentUserId');
          if (savedUserId) {
              const found = finalUsers.find(u => u.id === savedUserId);
              if (found) setUser(found);
          }
        }

      } catch (e) {
        console.error("Failed to fetch users", e);
        const fallbackUsers: User[] = [
           { id: 'admin', name: 'Admin (Team Leader)', role: 'admin' },
           { id: 'spec1', name: 'Maria Tasiou', role: 'specialist' },
        ];
        setUsersList(fallbackUsers);
        
        if (typeof window !== 'undefined') {
          const savedUserId = localStorage.getItem('currentUserId');
          if (savedUserId) {
              const found = fallbackUsers.find(u => u.id === savedUserId);
              if (found) setUser(found);
          }
        }
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  const login = (userId: string) => {
    const foundUser = usersList.find(u => u.id === userId);
    if (foundUser) {
      setUser(foundUser);
      if (typeof window !== 'undefined') {
        localStorage.setItem('currentUserId', userId);
      }
    }
  };

  const logout = () => {
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('currentUserId');
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, users: usersList, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
