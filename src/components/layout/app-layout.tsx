
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
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

interface AppLayoutProps {
  children: ReactNode;
}

function AppLayoutContent({ children }: AppLayoutProps) {
  const { currentUser, logout, setActiveProfile } = useUserProfile();
  const { hasMounted } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();

  const handleProfileChange = (value: string) => {
    if (currentUser) {
      const newProfile = value as UserProfileType;
      if (newProfile === "Administrador de Controles Internos" && !currentUser.roles.includes("admin")) {
        // console.warn("Attempting to switch to Admin profile without 'admin' role.");
        return;
      }
      if (newProfile === "Dono do Controle" && !currentUser.roles.includes("control-owner")) {
        // console.warn("Attempting to switch to Control Owner profile without 'control-owner' role.");
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
      router.push('/');
    }
  }, [currentUser, pathname, router]);

  if (!currentUser && pathname !== '/login') {
    return <div className="flex flex-1 items-center justify-center min-h-screen"><p>Redirecionando para login...</p></div>;
  }

  if (pathname === '/login' && !currentUser) {
    return <>{children}</>;
  }

  if (!hasMounted) {
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
          <div className="flex items-center gap-5 md:gap-6 h-8" /> {/* Placeholder for user controls */}
        </header>
        <div className="flex flex-1">
          <main className="flex-1 p-4 overflow-y-auto md:p-6 lg:p-8 h-[calc(100vh-4rem)]">
            {children}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 flex items-center justify-between h-16 px-4 border-b md:px-6 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          {/* SidebarTrigger will render null if !hasMounted or !isMobile (due to its internal logic) */}
          <SidebarTrigger />
          <NextLink href="/" className="flex items-center gap-2 text-primary hover:no-underline">
            <Icons.AppLogo className="w-7 h-7" />
            <h1 className="text-xl font-semibold">
              {siteConfig.description}
            </h1>
          </NextLink>
        </div>
        <div className="flex items-center gap-5 md:gap-6">
          {hasMounted && currentUser ? (
            <>
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <Select value={currentUser.activeProfile} onValueChange={handleProfileChange}>
                  <SelectTrigger className="w-[230px] text-sm h-9">
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
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground hidden md:inline">
                  {currentUser.name} {currentUser.activeProfile === "Administrador de Contoles Internos" ? "(ADM)" : ""}
                </span>
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{currentUser.name?.substring(0,2).toUpperCase()}</AvatarFallback>
                </Avatar>
              </div>
              <Bell className="h-5 w-5 text-muted-foreground cursor-pointer" />
              <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground hover:text-foreground">Logout</Button>
            </>
          ) : (
            // Placeholder to prevent layout shift and maintain structure consistency for hydration
            <div className="flex items-center gap-5 md:gap-6 h-8" />
          )}
        </div>
      </header>
      <div className="flex flex-1">
         {/* Sidebar will render null if !hasMounted (due to its internal logic) */}
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
