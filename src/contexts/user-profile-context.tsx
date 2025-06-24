
// src/contexts/user-profile-context.tsx
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useMemo, useEffect } from 'react';
import type { UserProfileType } from '@/types';
import { mockUsers, type MockUser } from '@/data/mock-data';
import { useRouter } from 'next/navigation'; // Import useRouter for logout redirect

interface UserProfileContextType {
  currentUser: MockUser | null;
  loading: boolean; // Add loading state
  login: (email: string, password: string) => MockUser | undefined;
  logout: () => void;
  isUserAdmin: () => boolean;
  isUserControlOwner: () => boolean;
  setActiveProfile: (profileType: UserProfileType) => void;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<MockUser | null>(null);
  const [loading, setLoading] = useState(true); // Initialize loading to true
  const router = useRouter();

  const login = (email: string, password: string): MockUser | undefined => {
    const user = mockUsers.find(u => u.email === email && u.password === password);
    if (user) {
      let profileToSet = user.activeProfile;
      if (!profileToSet) {
        if (user.roles.includes('admin')) {
            profileToSet = "Administrador de Controles Internos";
        } else if (user.roles.includes('control-owner')) {
            profileToSet = "Dono do Controle";
        } else {
            profileToSet = "Dono do Controle";
        }
      }
      const userToSet = { ...user, activeProfile: profileToSet };
      setCurrentUser(userToSet);
      localStorage.setItem('currentUser', JSON.stringify(userToSet)); // Persist immediately on login
      return userToSet;
    }
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    return undefined;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    router.push('/login'); // Redirect to login page on logout
  };

  const isUserAdmin = () => currentUser?.roles.includes('admin') ?? false;
  const isUserControlOwner = () => currentUser?.roles.includes('control-owner') ?? false;

  const setActiveProfile = (profileType: UserProfileType) => {
    if (currentUser) {
      let canSwitch = false;
      if (profileType === "Administrador de Controles Internos" && currentUser.roles.includes('admin')) {
        canSwitch = true;
      } else if (profileType === "Dono do Controle" && currentUser.roles.includes('control-owner')) {
        canSwitch = true;
      }
      
      if (canSwitch) {
        setCurrentUser(prevUser => prevUser ? { ...prevUser, activeProfile: profileType } : null);
      } else {
        console.warn(`User ${currentUser.name} cannot switch to profile ${profileType} based on their roles.`);
      }
    }
  };

  useEffect(() => {
    try {
      const storedUserJson = localStorage.getItem('currentUser');
      if (storedUserJson) {
        const storedUser = JSON.parse(storedUserJson) as MockUser;
        if (!storedUser.activeProfile) {
            if (storedUser.roles.includes('admin')) {
                storedUser.activeProfile = "Administrador de Controles Internos";
            } else if (storedUser.roles.includes('control-owner')) {
                storedUser.activeProfile = "Dono do Controle";
            } else {
                storedUser.activeProfile = "Dono do Controle";
            }
        }
        setCurrentUser(storedUser);
      }
    } catch (e) {
      console.error("Failed to parse stored user from localStorage", e);
      localStorage.removeItem('currentUser');
    } finally {
      setLoading(false); // Set loading to false after checking localStorage
    }
  }, []);

  useEffect(() => {
    // This effect is now only for reacting to changes from within the app, like setActiveProfile
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
      // On logout, removal is handled in the logout function to be immediate.
    }
  }, [currentUser]);


  const value = useMemo(() => ({
    currentUser,
    loading, // Expose loading state
    login,
    logout,
    isUserAdmin,
    isUserControlOwner,
    setActiveProfile,
  }), [currentUser, loading]);

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
