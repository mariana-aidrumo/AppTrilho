// src/contexts/user-profile-context.tsx
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useMemo } from 'react';
import type { UserProfile, UserProfileType } from '@/types';

interface UserProfileContextType {
  currentUser: UserProfile;
  setCurrentUserProfile: (profileType: UserProfileType) => void;
  isUserAdmin: () => boolean;
  isUserControlOwner: () => boolean;
}

const adminUser: UserProfile = {
  name: "Usuário Admin",
  profile: "Administrador de Controles Internos",
  controlsOwned: [], // Admin não "possui" controles no sentido de dono, mas tem acesso a todos
};

const ownerUser: UserProfile = {
  name: "Usuário Dono",
  profile: "Dono do Controle",
  // Mock de IDs de controle que este usuário "possui"
  // Estes IDs devem corresponder aos IDs dos `mockControls` em `sox-matrix/page.tsx`
  controlsOwned: ["1", "3"] 
};


const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserProfile>(adminUser); // Padrão para Admin

  const setCurrentUserProfile = (profileType: UserProfileType) => {
    if (profileType === "Administrador de Controles Internos") {
      setCurrentUser(adminUser);
    } else {
      setCurrentUser(ownerUser);
    }
  };

  const isUserAdmin = () => currentUser.profile === "Administrador de Controles Internos";
  const isUserControlOwner = () => currentUser.profile === "Dono do Controle";

  const value = useMemo(() => ({ 
    currentUser, 
    setCurrentUserProfile,
    isUserAdmin,
    isUserControlOwner 
  }), [currentUser]);

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
