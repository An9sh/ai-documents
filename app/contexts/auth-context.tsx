'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, getAuth, onAuthStateChanged } from 'firebase/auth';
import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

interface AuthContextType {
  user: User | null;
  loading: boolean;
  getFreshToken: () => Promise<string>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true,
  getFreshToken: async () => {
    throw new Error('Auth context not initialized');
  }
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getFreshToken = async () => {
    if (!user) throw new Error('No user logged in');
    return await user.getIdToken(true);
  };

  return (
    <AuthContext.Provider value={{ user, loading, getFreshToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext); 