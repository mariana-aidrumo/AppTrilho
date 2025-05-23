"use client";

import type { ReactNode } from 'react';
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
            <Link href="/" className="flex items-center gap-2 text-primary hover:no-underline">
              <Icons.AppLogo className="w-7 h-7" />
              <h1 className="text-xl font-semibold">
                {siteConfig.name}
              </h1>
            </Link>
          </div>
          {/* Placeholder for UserMenu or other header actions */}
          {/* <UserMenu /> */}
        </header>
        <div className="flex flex-1">
          <Sidebar collapsible="icon" side="left" variant="sidebar" className="border-r">
            <SidebarHeader className="flex items-center justify-center p-3 group-data-[collapsible=icon]:p-2">
              <Icons.AppLogo className="w-8 h-8 text-sidebar-foreground transition-all duration-300 group-data-[collapsible=icon]:w-6 group-data-[collapsible=icon]:h-6" />
              <span className="ml-2 text-lg font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
                Navigation
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

// Add a simple Link component for now, ideally use next/link
const Link = ({ href, children, className }: { href: string, children: ReactNode, className?: string }) => (
  <a href={href} className={className}>{children}</a>
);
