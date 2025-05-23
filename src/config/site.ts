
import type { LucideIcon } from "lucide-react";
import { ListChecks, FilePlus2, Home, History, CheckSquare, Layers, LayoutDashboard } from "lucide-react";
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
  name: "SOX Hub",
  description: "Hub de Controles SOX.",
  navItems: [
    // Itens para Administrador de Controles Internos
    {
      title: "Painel da Matriz SOX",
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
      title: "Criar Novo Controle",
      href: "/new-control",
      icon: FilePlus2,
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

