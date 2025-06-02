
// src/data/mock-data.ts
import type { SoxControl, ChangeRequest, VersionHistoryEntry, UserProfileType } from '@/types';

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
    { id: 'user-adm-1', name: 'Admin Master', email: 'usuario@adm.com', password: 'Senha123', roles: ['admin'], activeProfile: "Administrador de Controles Internos" },
    { id: 'user-owner-1', name: 'Control Owner Alpha', email: 'usuario@owner.com', password: 'Senha123', roles: ['control-owner'], activeProfile: "Dono do Controle", controlsOwned: ['1', '2'] },
    { id: 'user-other-1', name: 'Alice Wonderland', email: 'alice@example.com', password: 'Senha123', roles: ['control-owner'], activeProfile: "Dono do Controle", controlsOwned: ['1'] },
    { id: 'user-other-2', name: 'Bob The Builder', email: 'bob@example.com', password: 'Senha123', roles: ['control-owner'], activeProfile: "Dono do Controle", controlsOwned: ['2'] },
];

export const mockSoxControls: SoxControl[] = [
  {
    id: "1",
    controlId: "FIN-001",
    controlName: "Revisão de Conciliação Bancária",
    description: "Revisão mensal e aprovação das conciliações bancárias pelo gerente financeiro para garantir que todas as transações sejam registradas com precisão e quaisquer discrepâncias sejam identificadas e resolvidas em tempo hábil.",
    controlOwner: "Alice Wonderland", // Nome do Dono
    controlFrequency: "Mensal",
    controlType: "Detectivo",
    status: "Ativo",
    lastUpdated: new Date(Date.now() - 86400000 * 5).toISOString(),
    relatedRisks: ["Demonstração Financeira Incorreta", "Transações Fraudulentas", "Passivos Não Registrados"],
    testProcedures: "Verificar se as conciliações bancárias são realizadas mensalmente, revisadas independentemente e todos os itens de conciliação são investigados e compensados adequadamente. Obter uma amostra das conciliações bancárias concluídas e verificar as assinaturas e datas do preparador e revisor.",
    processo: "Relatórios Financeiros",
    subProcesso: "Fechamento Mensal",
    modalidade: "Manual",
    responsavel: "Carlos Pereira",
    n3Responsavel: "Gerência Financeira",
  },
  {
    id: "2",
    controlId: "ITG-005",
    controlName: "Aprovação de Acesso ao Sistema",
    description: "Revisão trimestral dos direitos de acesso do usuário a sistemas críticos.",
    controlOwner: "Bob The Builder", // Nome do Dono
    controlFrequency: "Por Solicitação",
    controlType: "Preventivo",
    status: "Ativo",
    lastUpdated: new Date().toISOString(),
    relatedRisks: ["Acesso Não Autorizado", "Violação de Dados"],
    testProcedures: "Amostra de logs de acesso do usuário e comparação com funções aprovadas.",
    processo: "Gerenciamento de Acesso de Usuário",
    subProcesso: "Provisionamento de Usuário",
    modalidade: "Automático",
    responsavel: "Fernanda Lima",
    n3Responsavel: "Diretoria de TI",
  },
   {
    id: "3",
    controlId: "PRO-012",
    controlName: "Due Diligence de Integridade",
    description: "Contagens cíclicas regulares de estoque para garantir a precisão.",
    controlOwner: "Control Owner Alpha", // Nome do Dono
    controlFrequency: "Por Novo Fornecedor",
    controlType: "Preventivo",
    status: "Ativo",
    lastUpdated: new Date().toISOString(),
    relatedRisks: ["Perda de Estoque", "Erros de Avaliação de Estoque"],
    testProcedures: "Realizar contagens cíclicas e investigar discrepâncias.",
    processo: "Compras",
    subProcesso: "Gerenciamento de Fornecedores",
    modalidade: "Manual",
    responsavel: "Mariana Costa",
    n3Responsavel: "Gerência de Suprimentos",
  },
  {
    id: "4",
    controlId: "SEC-002",
    controlName: "Revisão de Logs de Segurança",
    description: "Revisão diária de logs de segurança para identificar atividades suspeitas.",
    controlOwner: "Admin Master", // Nome do Dono
    controlFrequency: "Diário",
    controlType: "Detectivo",
    status: "Ativo",
    lastUpdated: new Date(Date.now() - 86400000 * 2).toISOString(),
    relatedRisks: ["Acesso não autorizado", "Violação de dados"],
    testProcedures: "Examinar logs de sistemas críticos em busca de anomalias.",
    processo: "Segurança da Informação",
    subProcesso: "Monitoramento de Segurança",
    modalidade: "Híbrido",
    responsavel: "Ricardo Alves",
    n3Responsavel: "CSO Office",
  },
];

export const mockChangeRequests: ChangeRequest[] = [
  {
    id: "cr1",
    controlId: "FIN-001",
    requestedBy: "Control Owner Alpha", // Nome do solicitante
    requestDate: new Date(Date.now() - 86400000 * 10).toISOString(),
    changes: {
      description: "Revisão mensal e aprovação das conciliações bancárias pelo gerente financeiro. Quaisquer discrepâncias identificadas devem ser resolvidas em 3 dias úteis.",
      controlFrequency: "Semanal",
    },
    status: "Pendente",
    comments: "Atualização da frequência e prazo de resolução.",
  },
  {
    id: "cr2",
    controlId: "ITG-005",
    requestedBy: "Bob The Builder", // Nome do solicitante
    requestDate: new Date(Date.now() - 86400000 * 8).toISOString(),
    changes: { controlOwner: "Peter Pan", responsavel: "Novo Responsável TI" },
    status: "Em Análise",
    comments: "Transferência de propriedade do controle e atualização de responsável.",
    reviewedBy: "Admin Master", // Nome do revisor
    reviewDate: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: "cr3-new-pending",
    controlId: "NEW-CTRL-OPS010", // ID temporário para novo controle
    requestedBy: "Control Owner Alpha", // Nome do solicitante
    requestDate: new Date(Date.now() - 86400000 * 5).toISOString(),
    changes: {
        controlName: "Validação de Entrada de Pedidos",
        justificativa: "Necessário para reduzir erros de processamento de pedidos e melhorar a qualidade dos dados do cliente.",
        description: "Necessário para reduzir erros de processamento de pedidos e melhorar a qualidade dos dados do cliente.", // Usando justificativa como descrição
        controlOwner: "Control Owner Alpha", // Sugerindo a si mesmo
        status: "Rascunho", // Começa como rascunho
    },
    status: "Pendente",
    comments: "Proposta de novo controle para validação de pedidos.",
  },
  {
    id: "cr4-feedback",
    controlId: "FIN-001",
    requestedBy: "Control Owner Alpha", // Nome do solicitante
    requestDate: new Date(Date.now() - 86400000 * 15).toISOString(),
    changes: {
      testProcedures: "Incluir verificação de transações acima de R$10.000 com dupla aprovação.",
      n3Responsavel: "VP Financeiro",
    },
    status: "Aguardando Feedback do Dono",
    comments: "Tentativa de atualização dos procedimentos de teste e N3.",
    reviewedBy: "Admin Master", // Nome do revisor
    reviewDate: new Date(Date.now() - 86400000 * 3).toISOString(),
    adminFeedback: "A proposta é boa, mas precisamos detalhar melhor como a 'dupla aprovação' será evidenciada e confirmar o N3. Por favor, revise e adicione detalhes sobre o sistema ou formulário de aprovação a ser usado.",
  },
  {
    id: "cr5-approved",
    controlId: "PRO-012",
    requestedBy: "Control Owner Alpha", // Nome do solicitante
    requestDate: new Date(Date.now() - 86400000 * 20).toISOString(),
    changes: {
      controlFrequency: "Semanal",
      description: "Contagens cíclicas semanais de estoque para garantir a precisão e identificar discrepâncias rapidamente.",
      responsavel: "Ana Silva (Atualizado)",
    },
    status: "Aprovado",
    comments: "Ajuste na frequência do controle PRO-012 e responsável.",
    reviewedBy: "Admin Master", // Nome do revisor
    reviewDate: new Date(Date.now() - 86400000 * 18).toISOString(),
  },
   {
    id: "cr6-rejected",
    controlId: "ITG-005",
    requestedBy: "Bob The Builder", // Nome do solicitante
    requestDate: new Date(Date.now() - 86400000 * 25).toISOString(),
    changes: {
      relatedRisks: ["Risco de performance do sistema"],
    },
    status: "Rejeitado",
    comments: "Adição de risco não justificada.",
    reviewedBy: "Admin Master", // Nome do revisor
    reviewDate: new Date(Date.now() - 86400000 * 22).toISOString(),
    adminFeedback: "O risco de performance do sistema não é diretamente mitigado por este controle de acesso. Por favor, crie um controle específico se necessário.",
  },
   {
    id: "cr-fin001-pending-details",
    controlId: "FIN-001",
    requestedBy: "Alice Wonderland", // Nome do solicitante
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
  { id: "vh1", controlId: "1", changeDate: new Date(Date.now() - 86400000 * 30).toISOString(), changedBy: "Admin Master", summaryOfChanges: "Controle FIN-001 Criado.", newValues: { controlName: "Revisão de Conciliação Bancária", status: "Ativo", responsavel: "Carlos Pereira", n3Responsavel: "Gerência Financeira" } },
  { id: "vh2", controlId: "1", changeDate: new Date(Date.now() - 86400000 * 10).toISOString(), changedBy: "Control Owner Alpha", summaryOfChanges: "Solicitação de alteração cr1 enviada.", relatedChangeRequestId: "cr1" },
  { id: "vh3", controlId: "2", changeDate: new Date(Date.now() - 86400000 * 28).toISOString(), changedBy: "Admin Master", summaryOfChanges: "Controle ITG-005 Criado.", newValues: { controlName: "Aprovação de Acesso ao Sistema", status: "Ativo", responsavel: "Fernanda Lima", n3Responsavel: "Diretoria de TI" } },
  { id: "vh4", controlId: "3", changeDate: new Date(Date.now() - 86400000 * 26).toISOString(), changedBy: "Admin Master", summaryOfChanges: "Controle PRO-012 Criado.", newValues: { controlName: "Due Diligence de Integridade", status: "Ativo", responsavel: "Mariana Costa", n3Responsavel: "Gerência de Suprimentos" } },
  {
    id: "vh5",
    controlId: "3", // PRO-012
    changeDate: new Date(Date.now() - 86400000 * 18).toISOString(),
    changedBy: "Admin Master",
    summaryOfChanges: "Alterações da solicitação cr5-approved aplicadas.",
    previousValues: { controlFrequency: "Por Novo Fornecedor", description: "Contagens cíclicas regulares de estoque para garantir a precisão." },
    newValues: { controlFrequency: "Semanal", description: "Contagens cíclicas semanais de estoque para garantir a precisão e identificar discrepâncias rapidamente.", responsavel: "Ana Silva (Atualizado)" },
    relatedChangeRequestId: "cr5-approved"
  },
];

export const mockProcessos = ["Todos", "Relatórios Financeiros", "Gerenciamento de Acesso de Usuário", "Compras", "Operações Diárias", "Segurança da Informação", "Vendas"];
export const mockSubProcessos = ["Todos", "Fechamento Mensal", "Provisionamento de Usuário", "Gerenciamento de Fornecedores", "Monitoramento de Produção", "Monitoramento de Segurança", "Processamento de Pedidos"];
export const mockDonos = ["Todos", "Alice Wonderland", "Bob The Builder", "Control Owner Alpha", "Admin Master", "Equipe de Operações", "Departamento Financeiro (Gerente)", "Peter Pan"]; // Removido Charlie Brown para consistência
export const mockResponsaveis = ["Todos", "Carlos Pereira", "Fernanda Lima", "Mariana Costa", "Ricardo Alves", "Ana Silva (Atualizado)", "Equipe de Vendas", "Novo Responsável TI", "João Silva", "Maria Oliveira"];
export const mockN3Responsaveis = ["Todos", "Gerência Financeira", "Diretoria de TI", "Gerência de Suprimentos", "CSO Office", "Gerência Comercial", "CFO", "VP Financeiro", "Diretoria de Operações", "Head de Compras"];
