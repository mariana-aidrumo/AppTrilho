
// src/components/layout/horizontal-nav-items.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { useUserProfile } from "@/contexts/user-profile-context";
import { Button } from "@/components/ui/button";

export function HorizontalNavItems() {
  const pathname = usePathname();
  const { currentUser } = useUserProfile();

  if (!currentUser) {
    return null; 
  }

  const filteredNavItems = siteConfig.navItems.filter(item => {
    if (!item.allowedProfiles || item.allowedProfiles.length === 0) {
      return true; 
    }
    return item.allowedProfiles.includes(currentUser.activeProfile);
  });

  return (
    <div className="flex items-center space-x-1 sm:space-x-2 px-4 h-12 overflow-x-auto">
      {filteredNavItems.map((item) => {
        const title = item.dynamicTitle ? item.dynamicTitle(currentUser.activeProfile) : item.title;
        const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
        
        return (
          <Link href={item.href} key={item.href + title} passHref legacyBehavior>
            <Button
              variant="ghost"
              asChild
              className={cn(
                "h-auto px-3 py-2 text-sm font-medium rounded-md flex items-center gap-2 whitespace-nowrap", // Adicionado whitespace-nowrap
                isActive
                  ? "bg-primary/10 text-primary" // Estilo para item ativo
                  : "text-muted-foreground hover:bg-accent/10 hover:text-primary", // Estilo para item inativo
                item.disabled && "cursor-not-allowed opacity-50"
              )}
              disabled={item.disabled}
            >
              <a>
                <item.icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
                <span>{title}</span>
              </a>
            </Button>
          </Link>
        );
      })}
    </div>
  );
}
