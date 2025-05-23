
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
      icon: LayoutDashboard, // Ícone mais genérico para painel
      allowedProfiles: ["Administrador de Controles Internos"],
    },
    {
      title: "Aprovações Pendentes",
      href: "/pending-approvals",
      icon: CheckSquare,
      allowedProfiles: ["Administrador de Controles Internos"],
    },
    {
        title: "Histórico da Matriz", // Terceiro item para Admin
        href: "/matrix-history",
        icon: History,
        allowedProfiles: ["Administrador de Controles Internos"],
    },

    // Itens para Dono do Controle
    {
      title: "Painel (Visão Geral)",
      href: "/sox-matrix",
      icon: Home, // Home para o dashboard principal do Dono
      allowedProfiles: ["Dono do Controle"],
    },
    {
      title: "Meus Controles Registrados",
      href: "/my-registered-controls",
      icon: Layers,
      allowedProfiles: ["Dono do Controle"],
    },
     {
      title: "Minhas Solicitações", // Terceiro item para Dono do Controle
      href: "/pending-approvals",
      icon: ListChecks,
      allowedProfiles: ["Dono do Controle"],
    },
    // A página "Propor Novo Controle" será acessada por botões, não pelo menu lateral.
    // A página "Histórico de Controles" (/version-history) foi removida da navegação principal do Admin
    // para manter 3 itens, mas o código da página pode ser mantido.
  ],
};
