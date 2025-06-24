// src/components/layout/app-layout.tsx
"use client";

import type { ReactNode } from 'react';
import NextLink from 'next/link';
import Icons from "@/components/icons";
import { siteConfig } from "@/config/site";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Bell, Users } from "lucide-react";
import { useUserProfile } from '@/contexts/user-profile-context';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNotification } from '@/contexts/notification-context';
import { HorizontalNavItems } from "@/components/layout/horizontal-nav-items";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { UserProfileType } from '@/types';

interface AppLayoutProps {
  children: ReactNode;
}

// O layout da aplicação é agora o único componente exportado,
// pois a lógica de login foi removida.
export function AppLayout({ children }: AppLayoutProps) {
  const { currentUser, setActiveProfile } = useUserProfile();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotification();

  // Função para lidar com a mudança de perfil
  const handleProfileChange = (value: string) => {
    const profile = value as UserProfileType;
    if (currentUser.activeProfile !== profile) {
      setActiveProfile(profile);
    }
  };

  // Como não há mais estado de carregamento, o layout é renderizado diretamente.
  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 flex items-center justify-between h-16 px-4 border-b md:px-6 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <NextLink href="/" className="flex items-center gap-2 text-primary hover:no-underline">
            <Icons.AppLogo className="w-7 h-7" />
            <h1 className="text-xl font-semibold">
              {siteConfig.description}
            </h1>
          </NextLink>
        </div>
        <div className="flex items-center gap-3 md:gap-4">
            {/* Seletor de Perfil */}
            <Select value={currentUser.activeProfile} onValueChange={handleProfileChange}>
                <SelectTrigger className="w-auto sm:w-[280px] h-9">
                    <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Selecionar Perfil" />
                </SelectTrigger>
                <SelectContent>
                    {currentUser.roles.includes('admin') && (
                        <SelectItem value="Administrador de Controles Internos">Administrador de Controles Internos</SelectItem>
                    )}
                    {currentUser.roles.includes('control-owner') && (
                        <SelectItem value="Dono do Controle">Dono do Controle</SelectItem>
                    )}
                </SelectContent>
            </Select>

            {/* Informações do Usuário */}
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground hidden sm:block" />
              <span className="text-sm text-muted-foreground hidden md:inline">
                {currentUser.name}
              </span>
              <Avatar className="h-8 w-8">
                <AvatarFallback>{currentUser.name?.substring(0,2).toUpperCase()}</AvatarFallback>
              </Avatar>
            </div>

            {/* Popover de Notificações */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-xs font-medium text-white">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <div className="p-4">
                  <h4 className="font-medium leading-none">Notificações</h4>
                  {notifications.length === 0 ? (
                    <p className="text-sm text-muted-foreground mt-2">Nenhuma notificação nova.</p>
                  ) : (
                     <p className="text-sm text-muted-foreground mt-1">
                      Você tem {unreadCount} {unreadCount === 1 ? 'não lida' : 'não lidas'}.
                    </p>
                  )}
                </div>
                {notifications.length > 0 && (
                  <div className="border-t border-border">
                    <div className="max-h-60 overflow-y-auto">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-3 border-b border-border last:border-b-0 ${!notification.read ? 'bg-primary/5' : ''}`}
                          onClick={() => {
                            if (!notification.read) markAsRead(notification.id);
                          }}
                        >
                          <div className="flex items-start gap-2">
                            {!notification.read && (
                              <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
                            )}
                            <div className="flex-1">
                              <p className={`text-sm ${!notification.read ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                                {notification.message}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {new Date(notification.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {unreadCount > 0 && (
                      <div className="p-2 border-t border-border">
                        <Button variant="link" size="sm" className="w-full text-primary" onClick={markAllAsRead}>
                          Marcar todas como lidas
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </PopoverContent>
            </Popover>
        </div>
      </header>
      
      <nav className="border-b bg-background shadow-sm">
        <HorizontalNavItems />
      </nav>

      <main className="flex-1 bg-muted/30">
        <div className="p-4 md:p-6 lg:p-8">
            {children}
        </div>
      </main>
    </div>
  );
}

    