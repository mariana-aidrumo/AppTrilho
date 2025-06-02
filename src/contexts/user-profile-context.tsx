
// src/contexts/user-profile-context.tsx
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useMemo, useEffect } from 'react';
import type { UserProfileType } from '@/types';
import { mockUsers, type MockUser } from '@/data/mock-data';
import { useRouter } from 'next/navigation'; // Import useRouter for logout redirect

interface UserProfileContextType {
  currentUser: MockUser | null;
  login: (email: string, password: string) => MockUser | undefined;
  logout: () => void;
  isUserAdmin: () => boolean;
  isUserControlOwner: () => boolean;
  setActiveProfile: (profileType: UserProfileType) => void; // Added to switch active profile
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<MockUser | null>(null);
  const router = useRouter();

  const login = (email: string, password: string): MockUser | undefined => {
    const user = mockUsers.find(u => u.email === email && u.password === password);
    if (user) {
      // Determine default activeProfile based on roles if not already set (though mock data now includes it)
      let profileToSet = user.activeProfile;
      if (!profileToSet) { // Fallback logic if activeProfile wasn't in mock
        if (user.roles.includes('admin')) {
            profileToSet = "Administrador de Controles Internos";
        } else if (user.roles.includes('control-owner')) {
            profileToSet = "Dono do Controle";
        } else {
            // Default to first role or a generic profile if necessary
            profileToSet = "Dono do Controle"; // Or handle as an error/default
        }
      }
      setCurrentUser({ ...user, activeProfile: profileToSet });
      return { ...user, activeProfile: profileToSet };
    }
    setCurrentUser(null);
    return undefined;
  };

  const logout = () => {
    setCurrentUser(null);
    router.push('/login'); // Redirect to login page on logout
  };

  const isUserAdmin = () => currentUser?.roles.includes('admin') ?? false;
  const isUserControlOwner = () => currentUser?.roles.includes('control-owner') ?? false;

  const setActiveProfile = (profileType: UserProfileType) => {
    if (currentUser) {
      // Basic check: does the user have a role corresponding to this profile?
      // This logic can be more sophisticated based on your role-to-profile mapping.
      let canSwitch = false;
      if (profileType === "Administrador de Controles Internos" && currentUser.roles.includes('admin')) {
        canSwitch = true;
      } else if (profileType === "Dono do Controle" && currentUser.roles.includes('control-owner')) {
        canSwitch = true;
      }
      // Add more profiles if needed

      if (canSwitch) {
        setCurrentUser(prevUser => prevUser ? { ...prevUser, activeProfile: profileType } : null);
      } else {
        console.warn(`User ${currentUser.name} cannot switch to profile ${profileType} based on their roles.`);
      }
    }
  };

  // Persist currentUser to localStorage (optional, for session persistence across reloads)
  useEffect(() => {
    const storedUserJson = localStorage.getItem('currentUser');
    if (storedUserJson) {
      try {
        const storedUser = JSON.parse(storedUserJson) as MockUser;
         // Ensure activeProfile is set, even for users stored before this field was added
        if (!storedUser.activeProfile) {
            if (storedUser.roles.includes('admin')) {
                storedUser.activeProfile = "Administrador de Controles Internos";
            } else if (storedUser.roles.includes('control-owner')) {
                storedUser.activeProfile = "Dono do Controle";
            } else {
                storedUser.activeProfile = "Dono do Controle"; // Default
            }
        }
        setCurrentUser(storedUser);
      } catch (e) {
        console.error("Failed to parse stored user from localStorage", e);
        localStorage.removeItem('currentUser');
      }
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('currentUser');
    }
  }, [currentUser]);


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
