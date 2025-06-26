
// src/data/mock-data.ts
import type { SoxControl, ChangeRequest, VersionHistoryEntry, UserProfileType, Notification, IPEAssertions, TenantUser } from '@/types';

export interface MockUser {
    id: string;
    name: string;
    email: string;
    password: string; // Apenas para simulação, não use senhas em texto plano em uma aplicação real!
    roles: string[]; // Ex: ['admin'], ['control-owner']
    activeProfile: UserProfileType; // Perfil ativo do usuário
    controlsOwned?: string[]; // IDs dos controles que este usuário possui
}

export const mockUsers: MockUser[] = [
    { id: 'user-adm-1', name: 'Carlos Ferreira', email: 'usuario@adm.com', password: 'Senha123', roles: ['admin', 'control-owner'], activeProfile: "Administrador de Controles Internos" },
    { id: 'user-owner-1', name: 'João da Silva', email: 'usuario@owner.com', password: 'Senha123', roles: ['control-owner'], activeProfile: "Dono do Controle", controlsOwned: ['1'] },
    { id: 'user-other-1', name: 'Ana Clara Souza', email: 'alice@example.com', password: 'Senha123', roles: ['control-owner'], activeProfile: "Dono do Controle", controlsOwned: ['1'] },
    { id: 'user-other-2', name: 'Pedro Oliveira', email: 'bob@example.com', password: 'Senha123', roles: ['control-owner'], activeProfile: "Dono do Controle", controlsOwned: [] },
];

export const mockSoxControls: SoxControl[] = [
  {
    id: "1",
    controlId: "RUMO.AF.01", // Código NOVO
    codigoAnterior: "RUMO_IMZ_02", // Cód Controle ANTERIOR
    controlName: "Aprovação dos projetos de investimento - Abertura, suplementação e encerramento",
    description: "Por ocorrência, o Time de Gestão de Capex gerencia as solicitações de abertura, suplementação e encerramento de projetos de investimentos de capitalização via sistema SGP e essas solicitações são aprovadas conforme Manual de Diretrizes de Aprovação (MDA).",
    controlOwner: "Helenize Maria Dubiela",
    controlFrequency: "Por ocorrência",
    controlType: "Preventivo",
    status: "Ativo",
    lastUpdated: new Date(Date.now() - 86400000 * 5).toISOString(),
    
    // New detailed fields from image
    matriz: "Rumo",
    processo: "Ativo Fixo",
    subProcesso: "1.Gestão de Projetos de Investimento",
    riscoId: "ATF.R.01",
    riscoDescricao: "Aquisição de ativos não aprovados conforme diretrizes internas ou em desacordo com os projetos de investimentos aprovados.",
    riscoClassificacao: "Alto",
    codigoCosan: "RUM.PPE.01",
    objetivoControle: "Validar e aprovar os projetos de investimento em suas diferentes fases.",
    tipo: "Chave",
    modalidade: "ITDM",
    mrc: false,
    evidenciaControle: "a) Base do sistema SGP com todas as solicitações de Abertura, Alteração de mudança (alteração de custo) e Encerrados;\nb) Ata enviada por e-mail com a aprovação do valor para o projeto/ workflow de aprovação com evidência do valor aprovado para o projeto;\nc) Tela do projeto do SGP com as informações financeiras;\nd) Tela do SAP evidenciando o cadastro do valor aprovado na Ata ou e-mail (abertura do PEP).",
    implementacaoData: "mai/25",
    dataUltimaAlteracao: "abr/25",
    sistemasRelacionados: ["SAP"],
    transacoesTelasMenusCriticos: "CJ03",
    aplicavelIPE: false,
    ipeAssertions: {
      C: true,
      EO: true,
      VA: true,
      OR: true,
      PD: true,
    },
    responsavel: "Patricia Ramos do Rosario",
    executorControle: ["Gustavo Alberto Peixoto", "Webert Soares Dias Raspante"],
    executadoPor: "Rumo",
    n3Responsavel: "Paula Formentini",
    area: "Escritório de Projetos",
    vpResponsavel: "Finanças",
    impactoMalhaSul: false,
    sistemaArmazenamento: "IB",
  }
];

export const mockChangeRequests: ChangeRequest[] = [
  {
    id: "cr1",
    controlId: "RUMO.AF.01", 
    requestedBy: "João da Silva",
    requestDate: new Date(Date.now() - 86400000 * 10).toISOString(),
    changes: {
      description: "Revisão mensal e aprovação das conciliações bancárias pelo gerente financeiro. Quaisquer discrepâncias identificadas devem ser resolvidas em 3 dias úteis.",
      controlFrequency: "Semanal",
    },
    status: "Pendente",
    comments: "Atualização da frequência e prazo de resolução.",
  },
  {
    id: "cr3-new-pending",
    controlId: "NEW-CTRL-OPS010",
    requestedBy: "João da Silva",
    requestDate: new Date(Date.now() - 86400000 * 5).toISOString(),
    changes: {
        controlName: "Validação de Entrada de Pedidos",
        justificativa: "Necessário para reduzir erros de processamento de pedidos e melhorar a qualidade dos dados do cliente.",
        description: "Necessário para reduzir erros de processamento de pedidos e melhorar a qualidade dos dados do cliente.",
        controlOwner: "João da Silva",
        status: "Rascunho",
    },
    status: "Pendente",
    comments: "Proposta de novo controle para validação de pedidos.",
  },
  {
    id: "cr4-feedback",
    controlId: "RUMO.AF.01",
    requestedBy: "João da Silva",
    requestDate: new Date(Date.now() - 86400000 * 15).toISOString(),
    changes: {
      testProcedures: "Incluir verificação de transações acima de R$10.000 com dupla aprovação.",
      n3Responsavel: "VP Financeiro",
    },
    status: "Aguardando Feedback do Dono",
    comments: "Tentativa de atualização dos procedimentos de teste e N3.",
    reviewedBy: "Carlos Ferreira",
    reviewDate: new Date(Date.now() - 86400000 * 3).toISOString(),
    adminFeedback: "A proposta é boa, mas precisamos detalhar melhor como a 'dupla aprovação' será evidenciada e confirmar o N3. Por favor, revise e adicione detalhes sobre o sistema ou formulário de aprovação a ser usado.",
  },
   {
    id: "cr-fin001-pending-details",
    controlId: "RUMO.AF.01", 
    requestedBy: "Ana Clara Souza",
    requestDate: new Date(Date.now() - 86400000 * 1).toISOString(),
    changes: {
        description: "Nova descrição proposta: Revisão e aprovação DIÁRIA das conciliações bancárias pelo gerente financeiro para garantir que todas as transações sejam registradas com precisão e quaisquer discrepâncias sejam identificadas e resolvidas em tempo hábil, com foco em transações de alto valor.",
        controlFrequency: "Diário",
        responsavel: "Carlos Pereira",
        n3Responsavel: "CFO",
    },
    status: "Pendente",
    comments: "Atualização para refletir a nova política de revisão diária e foco em transações de alto risco."
  }
];


export const mockVersionHistory: VersionHistoryEntry[] = [
  { id: "vh1", controlId: "1", changeDate: new Date(Date.now() - 86400000 * 30).toISOString(), changedBy: "Carlos Ferreira", summaryOfChanges: "Controle RUMO.AF.01 Criado.", newValues: { controlName: "Aprovação dos projetos de investimento - Abertura, suplementação e encerramento", status: "Ativo", responsavel: "Patricia Ramos do Rosario", n3Responsavel: "Paula Formentini" } },
  { id: "vh2", controlId: "1", changeDate: new Date(Date.now() - 86400000 * 10).toISOString(), changedBy: "João da Silva", summaryOfChanges: "Solicitação de alteração cr1 enviada.", relatedChangeRequestId: "cr1" },
];

export const mockProcessos = ["Todos", "Ativo Fixo", "Relatórios Financeiros", "Gerenciamento de Acesso de Usuário", "Compras", "Operações Diárias", "Segurança da Informação", "Vendas"];
export const mockSubProcessos = ["Todos", "1.Gestão de Projetos de Investimento", "Fechamento Mensal", "Provisionamento de Usuário", "Gerenciamento de Fornecedores", "Monitoramento de Produção", "Monitoramento de Segurança", "Processamento de Pedidos"];
export const mockDonos = ["Todos", "Helenize Maria Dubiela", "Ana Clara Souza", "Pedro Oliveira", "João da Silva", "Carlos Ferreira", "Equipe de Operações", "Departamento Financeiro (Gerente)", "Lucas Mendes"];
export const mockResponsaveis = ["Todos", "Patricia Ramos do Rosario", "Gustavo Alberto Peixoto", "Webert Soares Dias Raspante", "Carlos Pereira", "Fernanda Lima", "Mariana Costa", "Ricardo Alves", "Ana Silva (Atualizado)", "Equipe de Vendas", "Novo Responsável TI", "João Silva", "Maria Oliveira", "Beatriz Santos", "Rafael Almeida"];
export const mockN3Responsaveis = ["Todos", "Paula Formentini", "Gerência Financeira", "Diretoria de TI", "Gerência de Suprimentos", "CSO Office", "Gerência Comercial", "CFO", "VP Financeiro", "Diretoria de Operações", "Head de Compras", "Superintendência de Riscos"];


export const mockNotifications: Notification[] = [
  {
    id: "notif-cr1-pending-adm",
    userId: "user-adm-1", // Para Carlos Ferreira (Admin)
    message: `Nova solicitação de alteração (cr1) para o controle RUMO.AF.01 por João da Silva.`,
    date: new Date(Date.now() - 86400000 * 10 + 10000).toISOString(), // Um pouco depois da solicitação
    read: false,
  },
  {
    id: "notif-cr4-feedback-owner",
    userId: "user-owner-1", // Para João da Silva (Dono)
    message: `Carlos Ferreira solicitou ajustes na sua proposta cr4-feedback para o controle RUMO.AF.01.`,
    date: new Date(Date.now() - 86400000 * 3 + 10000).toISOString(),
    read: false,
  },
  {
    id: "notif-fin001-details-adm",
    userId: "user-adm-1", // Para Carlos Ferreira (Admin)
    message: `Ana Clara Souza enviou uma nova solicitação (cr-fin001-pending-details) para o controle RUMO.AF.01.`,
    date: new Date(Date.now() - 86400000 * 1 + 10000).toISOString(),
    read: false,
  },
  {
    id: "notif-geral-adm-1",
    userId: "user-adm-1",
    message: `Lembrete: Revisar políticas de acesso trimestralmente.`,
    date: new Date(Date.now() - 86400000 * 2).toISOString(),
    read: true,
  },
  {
    id: "notif-geral-owner-1",
    userId: "user-owner-1",
    message: `O controle PRO-012 teve sua frequência alterada para Semanal.`,
    date: new Date(Date.now() - 86400000 * 17).toISOString(), // Após aprovação
    read: false,
  },
];

// Re-exporting TenantUser from types to be used in other files if needed
export type { TenantUser };
