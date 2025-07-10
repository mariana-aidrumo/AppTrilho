// src/data/mock-data.ts
import type { Notification } from '@/types';

// Mock notifications for the default user 'user-default-mariana'
export const mockNotifications: Notification[] = [
  {
    id: 'notif-1',
    userId: 'user-default-mariana',
    message: 'Sua solicitação para o controle FIN-001 foi aprovada.',
    date: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
    read: false,
  },
  {
    id: 'notif-2',
    userId: 'user-default-mariana',
    message: 'Uma nova política de acesso foi implementada. Por favor, revise.',
    date: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    read: false,
  },
  {
    id: 'notif-3',
    userId: 'user-default-mariana',
    message: 'Lembrete: O controle ADM-012 precisa de sua revisão trimestral.',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    read: true,
  },
];
