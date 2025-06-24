// src/contexts/user-profile-context.tsx
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useMemo } from 'react';
import type { UserProfileType } from '@/types';
import { mockUsers, type MockUser } from '@/data/mock-data';

interface UserProfileContextType {
  currentUser: MockUser; // O usuário nunca será nulo
  login: (email: string, password: string) => MockUser | undefined; // Mantido para tipagem, mas não será usado
  logout: () => void; // Mantido para tipagem, mas não será usado
  isUserAdmin: () => boolean;
  isUserControlOwner: () => boolean;
  setActiveProfile: (profileType: UserProfileType) => void;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

// Define um usuário padrão para carregar a aplicação.
// O usuário administrador agora tem ambos os papéis para permitir a troca de perfis.
const defaultUser = mockUsers.find(u => u.id === 'user-adm-1')!;

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
        // Se a troca não for permitida, reverte para o perfil principal do usuário
        const primaryProfile = currentUser.roles.includes('admin') ? "Administrador de Controles Internos" : "Dono do Controle";
        setCurrentUser(prevUser => ({ ...prevUser, activeProfile: primaryProfile }));
        console.warn(`User ${currentUser.name} cannot switch to profile ${profileType}. Reverting to primary profile.`);
      }
  };
  
  // Funções de login e logout são mantidas para evitar quebrar a tipagem, mas não fazem nada.
  const login = (email: string, password: string): MockUser | undefined => {
    console.warn("Login function is disabled.");
    return undefined;
  };
  const logout = () => {
    console.warn("Logout function is disabled.");
  };

  const value = useMemo(() => ({
    currentUser,
    login,
    logout,
    isUserAdmin,
    isUserControlOwner,
    setActiveProfile,
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

    