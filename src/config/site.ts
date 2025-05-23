
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
        title: "Histórico da Matriz", 
        href: "/matrix-history",
        icon: History,
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
      title: "Meus Controles Registrados",
      href: "/my-registered-controls",
      icon: Layers,
      allowedProfiles: ["Dono do Controle"],
    },
     {
      title: "Solicitar Novo Controle", 
      href: "/new-control", // Rota para o formulário de novo controle
      icon: FilePlus2,
      allowedProfiles: ["Dono do Controle"],
    },
    // A página "Minhas Solicitações" será acessada através de um card/link no "Painel (Visão Geral)"
    // A página de "Propor Novo Controle" agora é um item de menu direto para o Dono.
  ],
};

