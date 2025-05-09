'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { auth, onAuthStateChange, signInWithGoogle } from '../lib/firebase';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: Error | null;
  getFreshToken: () => Promise<string>;
  signInWithGoogle: () => Promise<User>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  getFreshToken: async () => {
    throw new Error('Auth context not initialized');
  },
  signInWithGoogle: async () => {
    throw new Error('Auth context not initialized');
  }
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const router = useRouter();

  const getFreshToken = async () => {
    if (!user) throw new Error('No user logged in');
    return await user.getIdToken(true);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      setUser(user);
      setLoading(false);
      if (user) {
        router.push('/dashboard');
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, error, getFreshToken, signInWithGoogle }}>
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