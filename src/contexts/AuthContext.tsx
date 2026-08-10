import React, { createContext, useContext } from 'react';
import { User } from 'firebase/auth';
import { useAuth } from '../hooks/useAuth';

interface AuthContextType {
  user: User | null;
  authLoading: boolean;
  pendingMigrationData: any;
  setPendingMigrationData: (data: any) => void;
  handleGuestSignIn: () => void;
  handleGoogleSignIn: () => void;
  handleLogout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  
  // These implementations will be moved from App.tsx into useAuth eventually,
  // but for now we provide them here.
  const handleGuestSignIn = () => {
    // Implement
  };

  const handleGoogleSignIn = () => {
    // Implement
  };

  const handleLogout = () => {
    // Implement
  };

  return (
    <AuthContext.Provider value={{
      user: auth.user,
      authLoading: auth.authLoading,
      pendingMigrationData: auth.pendingMigrationData,
      setPendingMigrationData: auth.setPendingMigrationData,
      handleGuestSignIn,
      handleGoogleSignIn,
      handleLogout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuthContext must be used within AuthProvider');
  return context;
}
