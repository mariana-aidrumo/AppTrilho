import type { LucideIcon } from "lucide-react";
import { Table2, ListChecks, FilePlus2 } from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
};

export type SiteConfig = {
  name: string;
  description: string;
  navItems: NavItem[];
};

export const siteConfig: SiteConfig = {
  name: "HUB CONTROLES INTERNOS",
  description: "Plataforma para gestão de controles internos SOX.",
  navItems: [
    {
      title: "SOX Matrix",
      href: "/sox-matrix",
      icon: Table2,
    },
    {
      title: "Pending Approvals",
      href: "/pending-approvals",
      icon: ListChecks,
    },
    {
      title: "New Control",
      href: "/new-control",
      icon: FilePlus2,
    },
  ],
};
