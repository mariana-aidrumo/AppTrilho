// src/data/mock-data.ts
import type { SoxControl, ChangeRequest, VersionHistoryEntry } from '@/types'; // EvidenceFile removido

export const mockSoxControls: SoxControl[] = [
  {
    id: "1",
    controlId: "FIN-001",
    controlName: "Revisão de Conciliação Bancária",
    description: "Revisão mensal e aprovação das conciliações bancárias pelo gerente financeiro para garantir que todas as transações sejam registradas com precisão e quaisquer discrepâncias sejam identificadas e resolvidas em tempo hábil.",
    controlOwner: "Alice Wonderland", // Pertence ao Usuário Dono (ownerUser em user-profile-context)
    controlFrequency: "Mensal",
    controlType: "Detectivo",
    status: "Ativo",
    lastUpdated: new Date(Date.now() - 86400000 * 5).toISOString(),
    relatedRisks: ["Demonstração Financeira Incorreta", "Transações Fraudulentas", "Passivos Não Registrados"],
    testProcedures: "Verificar se as conciliações bancárias são realizadas mensalmente, revisadas independentemente e todos os itens de conciliação são investigados e compensados adequadamente. Obter uma amostra das conciliações bancárias concluídas e verificar as assinaturas e datas do preparador e revisor.",
    // evidenceRequirements: "Relatório de conciliação bancária assinado, cronogramas de suporte para itens de conciliação e evidência de acompanhamento de itens pendentes.", // Removido
    processo: "Relatórios Financeiros",
    subProcesso: "Fechamento Mensal",
    modalidade: "Manual",
  },
  {
    id: "2",
    controlId: "ITG-005",
    controlName: "Aprovação de Acesso ao Sistema",
    description: "Revisão trimestral dos direitos de acesso do usuário a sistemas críticos.",
    controlOwner: "Bob The Builder",
    controlFrequency: "Por Solicitação",
    controlType: "Preventivo",
    status: "Ativo",
    lastUpdated: new Date().toISOString(),
    relatedRisks: ["Acesso Não Autorizado", "Violação de Dados"],
    testProcedures: "Amostra de logs de acesso do usuário e comparação com funções aprovadas.",
    // evidenceRequirements: "Documentação de revisão de acesso do usuário com aprovações.", // Removido
    processo: "Gerenciamento de Acesso de Usuário",
    subProcesso: "Provisionamento de Usuário",
    modalidade: "Automático",
  },
   {
    id: "3",
    controlId: "PRO-012",
    controlName: "Due Diligence de Integridade",
    description: "Contagens cíclicas regulares de estoque para garantir a precisão.",
    controlOwner: "Usuário Dono", // Pertence ao Usuário Dono (ownerUser em user-profile-context)
    controlFrequency: "Por Novo Fornecedor",
    controlType: "Preventivo",
    status: "Ativo", // Mudado para Ativo para estar na lista de "Meus Controles"
    lastUpdated: new Date().toISOString(),
    relatedRisks: ["Perda de Estoque", "Erros de Avaliação de Estoque"],
    testProcedures: "Realizar contagens cíclicas e investigar discrepâncias.",
    // evidenceRequirements: "Folhas de contagem cíclica e relatórios de ajuste.", // Removido
    processo: "Compras",
    subProcesso: "Gerenciamento de Fornecedores",
    modalidade: "Manual",
  },
  {
    id: "4",
    controlId: "SEC-002",
    controlName: "Revisão de Logs de Segurança",
    description: "Revisão diária de logs de segurança para identificar atividades suspeitas.",
    controlOwner: "Usuário Admin",
    controlFrequency: "Diário",
    controlType: "Detectivo",
    status: "Ativo",
    lastUpdated: new Date(Date.now() - 86400000 * 2).toISOString(),
    relatedRisks: ["Acesso não autorizado", "Violação de dados"],
    testProcedures: "Examinar logs de sistemas críticos em busca de anomalias.",
    // evidenceRequirements: "Relatórios de revisão de logs com ações tomadas.", // Removido
    processo: "Segurança da Informação",
    subProcesso: "Monitoramento de Segurança",
    modalidade: "Híbrido",
  },
];

export const mockChangeRequests: ChangeRequest[] = [
  {
    id: "cr1",
    controlId: "FIN-001",
    requestedBy: "Usuário Dono", // John Doe é o Dono do Controle para este item
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
    requestedBy: "Bob The Builder",
    requestDate: new Date(Date.now() - 86400000 * 8).toISOString(),
    changes: { controlOwner: "Peter Pan" },
    status: "Em Análise",
    comments: "Transferência de propriedade do controle.",
    reviewedBy: "Usuário Admin", // Admin está analisando
    reviewDate: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: "cr3-new-pending", // Novo controle proposto pelo Dono do Controle
    controlId: "NEW-CTRL-OPS010", // ID temporário para um novo controle
    requestedBy: "Usuário Dono",
    requestDate: new Date(Date.now() - 86400000 * 5).toISOString(),
    changes: {
        controlId: "OPS-010", // ID definitivo proposto
        controlName: "Validação de Entrada de Pedidos",
        description: "Verificação automática de todos os campos obrigatórios e formatos de dados na entrada de novos pedidos de clientes para garantir a integridade dos dados antes do processamento.",
        justificativa: "Necessário para reduzir erros de processamento de pedidos e melhorar a qualidade dos dados do cliente.",
        controlOwner: "Usuário Dono", // Proposto
        controlFrequency: "Ad-hoc", // Por transação
        controlType: "Preventivo",
        processo: "Vendas",
        subProcesso: "Processamento de Pedidos",
        modalidade: "Automático",
    },
    status: "Pendente",
    comments: "Proposta de novo controle para validação de pedidos."
  },
  {
    id: "cr4-feedback", // Solicitação que requer feedback do Dono
    controlId: "FIN-001", // Alteração em controle existente do Dono
    requestedBy: "Usuário Dono",
    requestDate: new Date(Date.now() - 86400000 * 15).toISOString(),
    changes: {
      testProcedures: "Incluir verificação de transações acima de R$10.000 com dupla aprovação.",
    },
    status: "Aguardando Feedback do Dono",
    comments: "Tentativa de atualização dos procedimentos de teste.",
    reviewedBy: "Usuário Admin",
    reviewDate: new Date(Date.now() - 86400000 * 3).toISOString(),
    adminFeedback: "A proposta é boa, mas precisamos detalhar melhor como a 'dupla aprovação' será evidenciada. Por favor, revise e adicione detalhes sobre o sistema ou formulário de aprovação a ser usado.",
  },
  {
    id: "cr5-approved", // Solicitação aprovada
    controlId: "PRO-012", // Controle PRO-012 agora pertence ao Usuário Dono
    requestedBy: "Usuário Dono",
    requestDate: new Date(Date.now() - 86400000 * 20).toISOString(),
    changes: {
      controlFrequency: "Semanal",
      description: "Contagens cíclicas semanais de estoque para garantir a precisão e identificar discrepâncias rapidamente.",
    },
    status: "Aprovado",
    comments: "Ajuste na frequência do controle PRO-012.",
    reviewedBy: "Usuário Admin",
    reviewDate: new Date(Date.now() - 86400000 * 18).toISOString(),
  },
   {
    id: "cr6-rejected", // Solicitação rejeitada
    controlId: "ITG-005",
    requestedBy: "Bob The Builder",
    requestDate: new Date(Date.now() - 86400000 * 25).toISOString(),
    changes: {
      relatedRisks: ["Risco de performance do sistema"], // Tentativa de adicionar risco
    },
    status: "Rejeitado",
    comments: "Adição de risco não justificada.",
    reviewedBy: "Usuário Admin",
    reviewDate: new Date(Date.now() - 86400000 * 22).toISOString(),
    adminFeedback: "O risco de performance do sistema não é diretamente mitigado por este controle de acesso. Por favor, crie um controle específico se necessário.",
  },
   { // Solicitação pendente para o controle FIN-001 (diferente de cr1) para teste
    id: "cr-fin001-pending-details",
    controlId: "FIN-001", // Este ID corresponde ao mockSoxControls[0].controlId
    requestedBy: "Alice Wonderland", // Dono original do FIN-001
    requestDate: new Date(Date.now() - 86400000 * 1).toISOString(),
    changes: {
        description: "Nova descrição proposta: Revisão e aprovação DIÁRIA das conciliações bancárias pelo gerente financeiro para garantir que todas as transações sejam registradas com precisão e quaisquer discrepâncias sejam identificadas e resolvidas em tempo hábil, com foco em transações de alto valor.",
        controlFrequency: "Diário",
    },
    status: "Pendente",
    comments: "Atualização para refletir a nova política de revisão diária e foco em transações de alto risco."
  }
];


export const mockVersionHistory: VersionHistoryEntry[] = [
  { id: "vh1", controlId: "1", changeDate: new Date(Date.now() - 86400000 * 30).toISOString(), changedBy: "Usuário Admin", summaryOfChanges: "Controle FIN-001 Criado.", newValues: { controlName: "Revisão de Conciliação Bancária", status: "Ativo" } },
  { id: "vh2", controlId: "1", changeDate: new Date(Date.now() - 86400000 * 10).toISOString(), changedBy: "Alice Wonderland", summaryOfChanges: "Solicitação de alteração cr1 enviada.", relatedChangeRequestId: "cr1" },
  { id: "vh3", controlId: "2", changeDate: new Date(Date.now() - 86400000 * 28).toISOString(), changedBy: "Usuário Admin", summaryOfChanges: "Controle ITG-005 Criado.", newValues: { controlName: "Aprovação de Acesso ao Sistema", status: "Ativo" } },
  { id: "vh4", controlId: "3", changeDate: new Date(Date.now() - 86400000 * 26).toISOString(), changedBy: "Usuário Admin", summaryOfChanges: "Controle PRO-012 Criado.", newValues: { controlName: "Due Diligence de Integridade", status: "Ativo" } },
  {
    id: "vh5",
    controlId: "3", // PRO-012
    changeDate: new Date(Date.now() - 86400000 * 18).toISOString(), // Data da aprovação de cr5-approved
    changedBy: "Usuário Admin",
    summaryOfChanges: "Alterações da solicitação cr5-approved aplicadas.",
    previousValues: { controlFrequency: "Por Novo Fornecedor", description: "Contagens cíclicas regulares de estoque para garantir a precisão." },
    newValues: { controlFrequency: "Semanal", description: "Contagens cíclicas semanais de estoque para garantir a precisão e identificar discrepâncias rapidamente." },
    relatedChangeRequestId: "cr5-approved"
  },
];

// Removido mockEvidenceFiles
// export const mockEvidenceFiles: EvidenceFile[] = [ ... ];

// Mock data for filters in sox-matrix page
export const mockProcessos = ["Todos", "Relatórios Financeiros", "Gerenciamento de Acesso de Usuário", "Compras", "Operações Diárias", "Segurança da Informação", "Vendas"];
export const mockSubProcessos = ["Todos", "Fechamento Mensal", "Provisionamento de Usuário", "Gerenciamento de Fornecedores", "Monitoramento de Produção", "Monitoramento de Segurança", "Processamento de Pedidos"];
export const mockDonos = ["Todos", "Alice Wonderland", "Bob The Builder", "Charlie Brown", "Usuário Dono", "Usuário Admin", "Equipe de Operações", "Departamento Financeiro (Gerente)", "Peter Pan"];
