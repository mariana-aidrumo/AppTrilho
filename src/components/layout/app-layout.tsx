
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

function AppLayoutContent({ children }: AppLayoutProps) {
  const { currentUser, setCurrentUserProfile } = useUserProfile();
  const { hasMounted } = useSidebar(); // Get hasMounted state from context

  const handleProfileChange = (value: string) => {
    setCurrentUserProfile(value as UserProfileType);
  };

  // Render a consistent structure. Conditional parts handle their own mounting state.
  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 flex items-center justify-between h-16 px-4 border-b md:px-6 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          {/* SidebarTrigger will render null if !hasMounted or !isMobile (due to its internal logic) */}
          <SidebarTrigger className="md:hidden" />
          <NextLink href="/" className="flex items-center gap-2 text-primary hover:no-underline">
            <Icons.AppLogo className="w-7 h-7" />
            <h1 className="text-xl font-semibold">
              {siteConfig.description}
            </h1>
          </NextLink>
        </div>
        <div className="flex items-center gap-5 md:gap-6">
          {hasMounted ? (
            <>
              <div className="flex items-center gap-3">
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
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground hidden md:inline">{currentUser.name}</span>
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{currentUser.name.substring(0,2).toUpperCase()}</AvatarFallback>
                </Avatar>
              </div>
              <Bell className="h-5 w-5 text-muted-foreground cursor-pointer" />
            </>
          ) : (
            // Placeholder for user controls during SSR / initial client render to maintain structure
            // Adjust width/height if necessary to prevent layout shifts, or keep it minimal
            <div className="flex items-center gap-5 md:gap-6 h-8"> {/* Ensure similar height as mounted controls */}
                {/* Optionally, render Skeletons here if you want visual placeholders */}
            </div>
          )}
        </div>
      </header>
      <div className="flex flex-1">
        {/* Sidebar component itself handles !hasMounted by returning null */}
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
          <main className="p-4 md:p-6 lg:p-8 overflow-y-auto h-[calc(100vh-4rem)]">
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
  )
}
