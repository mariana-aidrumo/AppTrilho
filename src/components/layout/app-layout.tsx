"use client";

import type { ReactNode } from 'react';
import NextLink from 'next/link'; // Renomeado para evitar conflito
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Bell } from "lucide-react"; // Ícones para o menu do usuário

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider defaultOpen>
      <div className="flex flex-col min-h-screen">
        <header className="sticky top-0 z-50 flex items-center justify-between h-16 px-4 border-b bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="md:hidden" />
            <NextLink href="/" className="flex items-center gap-2 text-primary hover:no-underline">
              <Icons.AppLogo className="w-7 h-7" />
              <h1 className="text-xl font-semibold">
                {siteConfig.description} {/* Alterado para description para "Hub de Controles SOX" */}
              </h1>
            </NextLink>
          </div>
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Alice (Dona do Controle)</span>
            <Avatar className="h-8 w-8">
              <AvatarFallback>ADC</AvatarFallback>
            </Avatar>
            <Bell className="h-5 w-5 text-muted-foreground cursor-pointer" /> {/* Ícone de Notificação */}
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
            {/* Optional: SidebarFooter for user profile, settings, logout */}
            {/* <SidebarFooter className="p-2">User Profile</SidebarFooter> */}
          </Sidebar>
          <SidebarInset className="flex-1 bg-background"> {/* Ensure SidebarInset takes up remaining space and has correct background */}
            <main className="p-4 md:p-6 lg:p-8 overflow-y-auto h-[calc(100vh-4rem)]"> {/* 4rem is header height */}
              {children}
            </main>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}

// Removido o componente Link local, pois NextLink de next/link é usado.
