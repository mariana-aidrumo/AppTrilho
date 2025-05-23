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
import Icons from "@/components/icons";

export function SidebarNavItems() {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      {siteConfig.navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <Link href={item.href} passHref legacyBehavior>
            <SidebarMenuButton
              asChild
              isActive={pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))}
              className={cn(
                "w-full justify-start",
                item.disabled && "cursor-not-allowed opacity-80"
              )}
              disabled={item.disabled}
              tooltip={{ children: item.title }}
            >
              <a>
                <item.icon className="h-5 w-5" />
                <span>{item.title}</span>
              </a>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
