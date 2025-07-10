// src/contexts/user-profile-context.tsx
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useMemo, useCallback } from 'react';
import type { UserProfileType, MockUser } from '@/types';
import { findUserByEmail } from '@/services/sox-service';

interface UserProfileContextType {
  currentUser: MockUser | null;
  isAuthenticated: boolean;
  isUserAdmin: () => boolean;
  isUserControlOwner: () => boolean;
  setActiveProfile: (profileType: UserProfileType) => void;
  loginWithEmail: (email: string) => Promise<boolean>;
  logout: () => void;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<MockUser | null>(null);

  const isAuthenticated = useMemo(() => !!currentUser, [currentUser]);

  const isUserAdmin = useCallback(() => {
      return currentUser?.roles.includes('admin') ?? false;
  }, [currentUser]);

  const isUserControlOwner = useCallback(() => {
      return currentUser?.roles.includes('control-owner') ?? false;
  }, [currentUser]);

  const setActiveProfile = useCallback((profileType: UserProfileType) => {
      if (!currentUser) return;
      
      let canSwitch = false;
      if (profileType === "Administrador de Controles Internos" && currentUser.roles.includes('admin')) {
        canSwitch = true;
      } else if (profileType === "Dono do Controle" && currentUser.roles.includes('control-owner')) {
        canSwitch = true;
      }
      
      if (canSwitch) {
        setCurrentUser(prevUser => prevUser ? { ...prevUser, activeProfile: profileType } : null);
      } else {
        const primaryProfile = currentUser.roles.includes('admin') ? "Administrador de Controles Internos" : "Dono do Controle";
        setCurrentUser(prevUser => prevUser ? { ...prevUser, activeProfile: primaryProfile } : null);
      }
  }, [currentUser]);

  const loginWithEmail = useCallback(async (email: string): Promise<boolean> => {
    const lowerCaseEmail = email.toLowerCase();
    
    // Check for the special debug/default user
    if (lowerCaseEmail === 'mariana.costa@rumolog.com') {
      const defaultUser: MockUser = {
        id: 'user-default-mariana',
        name: 'Mariana Costa',
        email: lowerCaseEmail,
        roles: ['admin', 'control-owner'],
        activeProfile: 'Administrador de Controles Internos',
        controlsOwned: [], // Can be empty for the default user or populated if needed
      };
      setCurrentUser(defaultUser);
      return true;
    }

    // Normal flow for all other users
    try {
        const userToLogin = await findUserByEmail(lowerCaseEmail);
        if (userToLogin && userToLogin.roles.length > 0) {
          setCurrentUser(userToLogin);
          return true;
        }
        setCurrentUser(null);
        return false;
    } catch (error) {
        console.error("Login failed:", error);
        setCurrentUser(null);
        return false;
    }
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
  }, []);


  const value = useMemo(() => ({
    currentUser,
    isAuthenticated,
    isUserAdmin,
    isUserControlOwner,
    setActiveProfile,
    loginWithEmail,
    logout,
  }), [currentUser, isAuthenticated, isUserAdmin, isUserControlOwner, setActiveProfile, loginWithEmail, logout]);

  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  const context = useContext(UserProfileContext);
  if (context === undefined) {
    throw new Error('useUserProfile deve ser usado dentro de um UserProfileProvider');
  }
  return context;
}
