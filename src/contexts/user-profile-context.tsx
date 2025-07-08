// src/contexts/user-profile-context.tsx
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useMemo, useCallback } from 'react';
import type { UserProfileType } from '@/types';
import { mockUsers as initialMockUsers, type MockUser } from '@/data/mock-data';

interface UserProfileContextType {
  currentUser: MockUser | null;
  isAuthenticated: boolean;
  isUserAdmin: () => boolean;
  isUserControlOwner: () => boolean;
  setActiveProfile: (profileType: UserProfileType) => void;
  loginWithEmail: (email: string) => boolean;
  logout: () => void;
  
  // State management for users, now centralized here
  allUsers: MockUser[];
  addUser: (userData: { name: string; email: string }) => Promise<MockUser>;
  updateUserRolesAndProfile: (userId: string, roles: string[], activeProfile: UserProfileType) => Promise<MockUser | null>;
  deleteUser: (userId: string) => Promise<boolean>;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<MockUser | null>(null);
  const [allUsers, setAllUsers] = useState<MockUser[]>(initialMockUsers);

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
    // Use the stateful 'allUsers' list for login check
    const userToLogin = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (userToLogin) {
      const primaryProfile = userToLogin.roles.includes('admin') 
          ? "Administrador de Controles Internos" 
          : "Dono do Controle";
      setCurrentUser({ ...userToLogin, activeProfile: primaryProfile });
      return true;
    }
    setCurrentUser(null);
    return false;
  }, [allUsers]);

  const logout = useCallback(() => {
    setCurrentUser(null);
  }, []);

  // --- Centralized User Management Functions ---

  const addUser = useCallback(async (userData: { name: string; email: string }): Promise<MockUser> => {
    const newUser: MockUser = { 
        id: `user-new-${Date.now()}`, 
        ...userData, 
        password: 'DefaultPassword123', 
        roles: ['control-owner'], 
        activeProfile: 'Dono do Controle' 
    };
    setAllUsers(prevUsers => [...prevUsers, newUser]);
    return newUser;
  }, []);

  const updateUserRolesAndProfile = useCallback(async (userId: string, roles: string[], activeProfile: UserProfileType): Promise<MockUser | null> => {
    let updatedUser: MockUser | null = null;
    setAllUsers(prevUsers => {
        const newUsers = prevUsers.map(user => {
            if (user.id === userId) {
                updatedUser = { ...user, roles, activeProfile };
                return updatedUser;
            }
            return user;
        });
        return newUsers;
    });
    return updatedUser;
  }, []);

  const deleteUser = useCallback(async (userId: string): Promise<boolean> => {
    let userFound = false;
    setAllUsers(prevUsers => {
        const newUsers = prevUsers.filter(user => {
            if (user.id === userId) {
                userFound = true;
                return false; // Exclude this user
            }
            return true;
        });
        return newUsers;
    });
    return userFound;
  }, []);


  const value = useMemo(() => ({
    currentUser,
    isAuthenticated,
    isUserAdmin,
    isUserControlOwner,
    setActiveProfile,
    loginWithEmail,
    logout,
    allUsers, // Expose the stateful list
    addUser,
    updateUserRolesAndProfile,
    deleteUser,
  }), [currentUser, isAuthenticated, isUserAdmin, isUserControlOwner, setActiveProfile, loginWithEmail, logout, allUsers, addUser, updateUserRolesAndProfile, deleteUser]);

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
