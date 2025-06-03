// src/contexts/notification-context.tsx
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import type { Notification } from '@/types';
import { mockNotifications } from '@/data/mock-data'; // Assuming mockNotifications are here
import { useUserProfile } from './user-profile-context'; // For getting current user

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useUserProfile();
  const [userNotifications, setUserNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (currentUser) {
      // Filter mock notifications for the current user and initialize read status
      // In a real app, this would come from a backend and persistence layer
      const notificationsForUser = mockNotifications
        .filter(n => n.userId === currentUser.id)
        .map(n => ({ ...n, read: n.read || false })); // Ensure 'read' property exists
      setUserNotifications(notificationsForUser);
    } else {
      setUserNotifications([]);
    }
  }, [currentUser]);

  const unreadCount = useMemo(() => {
    return userNotifications.filter(n => !n.read).length;
  }, [userNotifications]);

  const markAsRead = useCallback((notificationId: string) => {
    setUserNotifications(prevNotifications =>
      prevNotifications.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setUserNotifications(prevNotifications =>
      prevNotifications.map(n => ({ ...n, read: true }))
    );
  }, []);

  const value = useMemo(() => ({
    notifications: userNotifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  }), [userNotifications, unreadCount, markAsRead, markAllAsRead]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
