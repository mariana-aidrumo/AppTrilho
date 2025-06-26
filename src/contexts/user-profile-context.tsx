// src/contexts/user-profile-context.tsx
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useMemo, useCallback } from 'react';
import type { UserProfileType } from '@/types';
import { mockUsers, type MockUser } from '@/data/mock-data';

interface UserProfileContextType {
  currentUser: MockUser;
  isUserAdmin: () => boolean;
  isUserControlOwner: () => boolean;
  setActiveProfile: (profileType: UserProfileType) => void;
  switchUser: (userId: string) => void;
  allUsers: MockUser[];
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

// Default to the first admin user found
const defaultUser = mockUsers.find(u => u.roles.includes('admin'))!;

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<MockUser>(defaultUser);

  const isUserAdmin = () => currentUser?.roles.includes('admin') ?? false;
  const isUserControlOwner = () => currentUser?.roles.includes('control-owner') ?? false;

  const setActiveProfile = (profileType: UserProfileType) => {
      let canSwitch = false;
      if (profileType === "Administrador de Controles Internos" && currentUser.roles.includes('admin')) {
        canSwitch = true;
      } else if (profileType === "Dono do Controle" && currentUser.roles.includes('control-owner')) {
        canSwitch = true;
      }
      
      if (canSwitch) {
        setCurrentUser(prevUser => ({ ...prevUser, activeProfile: profileType }));
      } else {
        const primaryProfile = currentUser.roles.includes('admin') ? "Administrador de Controles Internos" : "Dono do Controle";
        setCurrentUser(prevUser => ({ ...prevUser, activeProfile: primaryProfile }));
      }
  };

  const switchUser = useCallback((userId: string) => {
    const newUser = mockUsers.find(u => u.id === userId);
    if (newUser) {
        // When switching user, automatically set their active profile to their primary role.
        const primaryProfile = newUser.roles.includes('admin') 
            ? "Administrador de Controles Internos" 
            : "Dono do Controle";
        setCurrentUser({ ...newUser, activeProfile: primaryProfile });
    }
  }, []);
  

  const value = useMemo(() => ({
    currentUser,
    isUserAdmin,
    isUserControlOwner,
    setActiveProfile,
    switchUser,
    allUsers: mockUsers,
  }), [currentUser, switchUser]);

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
