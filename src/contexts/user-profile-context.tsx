
// src/contexts/user-profile-context.tsx
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useMemo, useCallback } from 'react';
import type { UserProfileType } from '@/types';
import { mockUsers, type MockUser } from '@/data/mock-data';

interface UserProfileContextType {
  currentUser: MockUser | null;
  isAuthenticated: boolean;
  isUserAdmin: () => boolean;
  isUserControlOwner: () => boolean;
  setActiveProfile: (profileType: UserProfileType) => void;
  loginWithEmail: (email: string) => boolean;
  logout: () => void;
  allUsers: MockUser[];
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

  const loginWithEmail = useCallback((email: string): boolean => {
    const userToLogin = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (userToLogin) {
      // When logging in, automatically set their active profile to their primary role.
      const primaryProfile = userToLogin.roles.includes('admin') 
          ? "Administrador de Controles Internos" 
          : "Dono do Controle";
      setCurrentUser({ ...userToLogin, activeProfile: primaryProfile });
      return true;
    }
    // If user not found, ensure current user is null and return false
    setCurrentUser(null);
    return false;
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
    allUsers: mockUsers,
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
