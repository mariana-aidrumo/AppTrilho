import type { LucideIcon } from "lucide-react";
import { Table2, ListChecks, FilePlus2, Home, FileEdit, History, Settings, LogOut } from "lucide-react";

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
  name: "SOX Hub",
  description: "Hub de Controles SOX.",
  navItems: [
    {
      title: "Painel",
      href: "/sox-matrix",
      icon: Home,
    },
    {
      title: "Controles", // Lista de Controles
      href: "/sox-matrix", 
      icon: ListChecks,
    },
    {
      title: "Minhas Solicitações", // Pending Approvals
      href: "/pending-approvals",
      icon: FileEdit,
    },
    {
      title: "Propor Novo Controle",
      href: "/new-control",
      icon: FilePlus2,
    },
    {
        title: "Histórico de Versões",
        href: "/version-history",
        icon: History,
    },
    // Itens de rodapé como "Configurações" e "Sair" podem exigir um tratamento de layout diferente.
    // Por enquanto, eles seriam adicionados aqui se desejado.
    // Exemplo:
    // {
    //   title: "Configurações",
    //   href: "/settings",
    //   icon: Settings,
    // },
    // {
    //   title: "Sair",
    //   href: "/logout",
    //   icon: LogOut,
    // },
  ],
};
