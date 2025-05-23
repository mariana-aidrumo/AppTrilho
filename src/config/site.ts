import type { LucideIcon } from "lucide-react";
import { ListChecks, FilePlus2, Home, History, CheckSquare } from "lucide-react";
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
    {
      title: "Painel", 
      href: "/sox-matrix",
      icon: Home,
      dynamicTitle: (profile) => profile === "Dono do Controle" ? "Meus Controles" : "Painel da Matriz SOX",
      allowedProfiles: ["Administrador de Controles Internos", "Dono do Controle"],
    },
    {
      title: "Aprovações Pendentes",
      href: "/pending-approvals",
      icon: CheckSquare, // Ícone mais apropriado para aprovações
      allowedProfiles: ["Administrador de Controles Internos"],
    },
     {
      title: "Minhas Solicitações",
      href: "/pending-approvals", 
      icon: ListChecks, // Usando ListChecks para solicitações do usuário
      allowedProfiles: ["Dono do Controle"],
    },
    {
      title: "Propor Novo Controle",
      href: "/new-control",
      icon: FilePlus2,
      allowedProfiles: ["Administrador de Controles Internos", "Dono do Controle"],
    },
    {
        title: "Histórico da Matriz",
        href: "/matrix-history",
        icon: History,
        allowedProfiles: ["Administrador de Controles Internos"],
    },
    {
        title: "Histórico de Controles", 
        href: "/version-history",
        icon: History, 
        allowedProfiles: ["Administrador de Controles Internos"],
    },
    // Dono do Controle pode ver o histórico dos *seus* controles, 
    // idealmente acessado de dentro da página de detalhes do controle ou "Meus Controles".
    // Para manter a barra lateral concisa, não adicionaremos um item específico aqui por enquanto.
  ],
};
