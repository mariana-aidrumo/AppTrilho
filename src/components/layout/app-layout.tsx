
// src/components/layout/app-layout.tsx
"use client";

import type { ReactNode } from 'react';
import NextLink from 'next/link';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarInset,
  SidebarTrigger,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import { SidebarNavItems } from "@/components/layout/sidebar-nav-items";
import Icons from "@/components/icons";
import { siteConfig } from "@/config/site";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Bell, Users } from "lucide-react";
import { useUserProfile } from '@/contexts/user-profile-context';
import type { UserProfileType } from '@/types';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNotification } from '@/contexts/notification-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

interface AppLayoutProps {
  children: ReactNode;
}

function AppLayoutContent({ children }: AppLayoutProps) {
  const { currentUser, logout, setActiveProfile } = useUserProfile();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotification();
  const { hasMounted } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();

  const handleProfileChange = (value: string) => {
    if (currentUser) {
      const newProfile = value as UserProfileType;
      if (newProfile === "Administrador de Controles Internos" && !currentUser.roles.includes("admin")) {
        return;
      }
      if (newProfile === "Dono do Controle" && !currentUser.roles.includes("control-owner")) {
        return;
      }
      setActiveProfile(newProfile);
      router.refresh();
    }
  };

  useEffect(() => {
    const publicRoutes = ['/login'];
    const isProtectedRoute = !publicRoutes.includes(pathname);

    if (isProtectedRoute && !currentUser) {
      router.push('/login');
    }
    if (pathname === '/login' && currentUser) {
      router.push('/'); // Redirect to home/dashboard if user is logged in and tries to access login
    }
  }, [currentUser, pathname, router]);

  // If on login page, render only children (which will be the LoginPage component)
  // This also implicitly handles the case where currentUser is null on the login page
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // If not on login page AND user is not logged in (and it's a protected route),
  // this part might not be reached due to the redirect above.
  // However, this ensures that if somehow we are on a protected route without a user,
  // we don't try to render the full layout with user-specific info.
  // The useEffect above should handle the redirect, so this is a fallback.
  if (!currentUser) {
    // Optionally, show a loading state or redirect again if the useEffect hasn't kicked in
    return null; // Or a loading spinner, or redirect explicitly again if needed
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 flex items-center justify-between h-16 px-4 border-b md:px-6 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <NextLink href="/" className="flex items-center gap-2 text-primary hover:no-underline">
            <Icons.AppLogo className="w-7 h-7" />
            <h1 className="text-xl font-semibold">
              {siteConfig.description}
            </h1>
          </NextLink>
        </div>
        <div className="flex items-center gap-3 md:gap-4">
          {hasMounted && currentUser ? (
            <>
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <Select value={currentUser.activeProfile} onValueChange={handleProfileChange}>
                  <SelectTrigger className="w-[200px] sm:w-[230px] text-sm h-9">
                    <SelectValue placeholder="Selecionar Perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentUser.roles.includes("admin") && (
                      <SelectItem value="Administrador de Controles Internos">Administrador de Controles</SelectItem>
                    )}
                    {currentUser.roles.includes("control-owner") && (
                       <SelectItem value="Dono do Controle">Dono do Controle</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground hidden sm:block" />
                <span className="text-sm text-muted-foreground hidden md:inline">
                  {currentUser.name}
                </span>
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{currentUser.name?.substring(0,2).toUpperCase()}</AvatarFallback>
                </Avatar>
              </div>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-xs font-medium text-white">
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
                            className={`p-3 border-b border-border last:border-b-0 cursor-pointer ${!notification.read ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/50'}`}
                            onClick={() => {
                              if (!notification.read) markAsRead(notification.id);
                              if (notification.link) {
                                router.push(notification.link);
                              }
                            }}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    if (!notification.read) markAsRead(notification.id);
                                    if (notification.link) router.push(notification.link);
                                }
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

              <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground hover:text-foreground">Logout</Button>
            </>
          ) : (
            <div className="flex items-center gap-3 md:gap-4 h-9" /> 
          )}
        </div>
      </header>
      <div className="flex flex-1">
        <Sidebar collapsible="icon" side="left" variant="sidebar" className="border-r">
          <SidebarHeader className="flex items-center justify-center p-4 group-data-[collapsible=icon]:p-4">
            <Icons.AppLogo className="w-8 h-8 text-sidebar-foreground transition-all duration-300 group-data-[collapsible=icon]:w-7 group-data-[collapsible=icon]:h-7" />
          </SidebarHeader>
          <SidebarContent className="p-2">
            <SidebarNavItems />
          </SidebarContent>
          <SidebarRail />
        </Sidebar>
        <SidebarInset className="flex-1 bg-background">
          <main className="p-4 overflow-y-auto md:p-6 lg:p-8 h-[calc(100vh-4rem)]">
            {children}
          </main>
        </SidebarInset>
      </div>
    </div>
  );
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider defaultOpen>
      <AppLayoutContent>{children}</AppLayoutContent>
    </SidebarProvider>
  );
}
