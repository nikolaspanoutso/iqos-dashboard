"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSession, signIn, signOut } from "next-auth/react";

export type UserRole = 'admin' | 'activator' | 'specialist';

export interface User {
  id: string;
  name: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password?: string) => Promise<boolean>;
  logout: () => void;
  users: User[];
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      setUser({
        id: (session.user as any).id,
        name: session.user.name || "",
        role: (session.user as any).role as UserRole,
      });
    } else if (status === "unauthenticated") {
      setUser(null);
    }
    setLoading(status === "loading");
  }, [session, status]);

  useEffect(() => {
    // Fetch user list for the login dropdown
    async function fetchUsers() {
      try {
        const res = await fetch('/api/users');
        const data = await res.json();
        if (Array.isArray(data)) {
          setUsersList(data);
        }
      } catch (e) {
        console.error("Failed to fetch users", e);
      }
    }
    fetchUsers();
  }, []);

  const login = async (username: string, password?: string) => {
    if (!password) return false;
    
    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    return !result?.error;
  };

  const logout = () => {
    signOut({ redirect: true, callbackUrl: "/" });
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
