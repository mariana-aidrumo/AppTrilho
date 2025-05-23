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
} from "@/components/ui/sidebar";
import { SidebarNavItems } from "@/components/layout/sidebar-nav-items";
import Icons from "@/components/icons";
import { siteConfig } from "@/config/site";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Bell, Users } from "lucide-react"; 
import { useUserProfile } from '@/contexts/user-profile-context';
import type { UserProfileType } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { currentUser, setCurrentUserProfile } = useUserProfile();

  const handleProfileChange = (value: string) => {
    setCurrentUserProfile(value as UserProfileType);
  };

  return (
    <SidebarProvider defaultOpen>
      <div className="flex flex-col min-h-screen">
        <header className="sticky top-0 z-50 flex items-center justify-between h-16 px-4 border-b bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="md:hidden" />
            <NextLink href="/" className="flex items-center gap-2 text-primary hover:no-underline">
              <Icons.AppLogo className="w-7 h-7" />
              <h1 className="text-xl font-semibold">
                {siteConfig.description}
              </h1>
            </NextLink>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <Select value={currentUser.profile} onValueChange={handleProfileChange}>
                <SelectTrigger className="w-[230px] text-sm h-9">
                  <SelectValue placeholder="Selecionar Perfil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Administrador de Controles Internos">Administrador de Controles</SelectItem>
                  <SelectItem value="Dono do Controle">Dono do Controle</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground hidden md:inline">{currentUser.name}</span>
              <Avatar className="h-8 w-8">
                <AvatarFallback>{currentUser.name.substring(0,2).toUpperCase()}</AvatarFallback>
              </Avatar>
            </div>
            <Bell className="h-5 w-5 text-muted-foreground cursor-pointer" />
          </div>
        </header>
        <div className="flex flex-1">
          <Sidebar collapsible="icon" side="left" variant="sidebar" className="border-r">
            <SidebarHeader className="flex items-center justify-center p-3 group-data-[collapsible=icon]:p-2">
              <Icons.AppLogo className="w-8 h-8 text-sidebar-foreground transition-all duration-300 group-data-[collapsible=icon]:w-6 group-data-[collapsible=icon]:h-6" />
              <span className="ml-2 text-lg font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
                Navegação
              </span>
            </SidebarHeader>
            <SidebarContent className="p-2">
              <SidebarNavItems />
            </SidebarContent>
            <SidebarRail />
          </Sidebar>
          <SidebarInset className="flex-1 bg-background">
            <main className="p-4 md:p-6 lg:p-8 overflow-y-auto h-[calc(100vh-4rem)]">
              {children}
            </main>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
