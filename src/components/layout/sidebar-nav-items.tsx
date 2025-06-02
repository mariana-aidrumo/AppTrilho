
// src/components/layout/sidebar-nav-items.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { siteConfig, type NavItem } from "@/config/site";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useUserProfile } from "@/contexts/user-profile-context";

export function SidebarNavItems() {
  const pathname = usePathname();
  const { currentUser } = useUserProfile();

  if (!currentUser) {
    return null; // Don't render nav items if no user is logged in
  }

  const filteredNavItems = siteConfig.navItems.filter(item => {
    if (!item.allowedProfiles || item.allowedProfiles.length === 0) {
      return true; 
    }
    // Filter based on the user's *active* profile
    return item.allowedProfiles.includes(currentUser.activeProfile);
  });

  return (
    <SidebarMenu>
      {filteredNavItems.map((item) => {
        // Use activeProfile for dynamic title if applicable
        const title = item.dynamicTitle ? item.dynamicTitle(currentUser.activeProfile) : item.title;
        const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
        return (
          <SidebarMenuItem key={item.href + title}>
            <Link href={item.href} passHref legacyBehavior>
              <SidebarMenuButton
                asChild
                isActive={isActive}
                className={cn(
                  "w-full justify-start",
                  isActive ? "border-l-4 border-primary pl-[calc(0.5rem-4px)]" : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  item.disabled && "cursor-not-allowed opacity-80"
                )}
                disabled={item.disabled}
                tooltip={{ children: title }}
              >
                <a>
                  <item.icon className="h-5 w-5" />
                  <span>{title}</span>
                </a>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
