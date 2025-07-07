
import type { LucideIcon } from "lucide-react";
import { ListChecks, FilePlus2, Home, History, CheckSquare, Layers, LayoutDashboard, UserCog, SlidersHorizontal, Terminal } from "lucide-react";
import type { UserProfileType } from "@/types";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
  allowedProfiles?: UserProfileType[];
  dynamicTitle?: (profile: UserProfileType) => string;
};

export type SiteConfig = {
  name: string;
  description: string;
  navItems: NavItem[];
};

export const siteConfig: SiteConfig = {
  name: "Portal de Controles Internos", // Internal name/ID
  description: "Portal de Controles Internos", // Displayed name updated
  navItems: [
    // Itens para Administrador de Controles Internos
    {
      title: "Painel Matriz",
      href: "/sox-matrix",
      icon: LayoutDashboard,
      allowedProfiles: ["Administrador de Controles Internos"],
    },
    {
      title: "Aprovações Pendentes",
      href: "/pending-approvals",
      icon: CheckSquare,
      allowedProfiles: ["Administrador de Controles Internos"],
    },
    {
      title: "Criar Controle",
      href: "/new-control",
      icon: FilePlus2,
      allowedProfiles: ["Administrador de Controles Internos"],
    },
    {
      title: "Gestão de Acessos",
      href: "/access-management",
      icon: UserCog,
      allowedProfiles: ["Administrador de Controles Internos"],
    },
    {
      title: "Diagnosticar Campos",
      href: "/debug-fields",
      icon: Terminal,
      allowedProfiles: ["Administrador de Controles Internos"],
    },
    {
      title: "Configurar Matriz",
      href: "/sharepoint-config",
      icon: SlidersHorizontal,
      allowedProfiles: ["Administrador de Controles Internos"],
    },
    

    // Itens para Dono do Controle
    {
      title: "Painel (Visão Geral)",
      href: "/sox-matrix",
      icon: Home,
      allowedProfiles: ["Dono do Controle"],
    },
    {
      title: "Meus Controles",
      href: "/my-registered-controls",
      icon: Layers, // Ícone alterado para Layers, mais genérico
      allowedProfiles: ["Dono do Controle"],
    },
    {
      title: "Minhas Solicitações",
      href: "/pending-approvals",
      icon: ListChecks,
      allowedProfiles: ["Dono do Controle"],
    },
    // Removido "Solicitar Novo Controle" daqui
  ],
};
