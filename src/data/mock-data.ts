
// src/data/mock-data.ts
import type { SoxControl, ChangeRequest, VersionHistoryEntry, EvidenceFile } from '@/types';

export const mockSoxControls: SoxControl[] = [
  {
    id: "1",
    controlId: "FIN-001",
    controlName: "Revisão de Conciliação Bancária",
    description: "Revisão mensal e aprovação das conciliações bancárias pelo gerente financeiro para garantir que todas as transações sejam registradas com precisão e quaisquer discrepâncias sejam identificadas e resolvidas em tempo hábil.",
    controlOwner: "Alice Wonderland",
    controlFrequency: "Mensal",
    controlType: "Detectivo",
    status: "Ativo",
    lastUpdated: new Date(Date.now() - 86400000 * 5).toISOString(), // 5 dias atrás
    relatedRisks: ["Demonstração Financeira Incorreta", "Transações Fraudulentas", "Passivos Não Registrados"],
    testProcedures: "Verificar se as conciliações bancárias são realizadas mensalmente, revisadas independentemente e todos os itens de conciliação são investigados e compensados adequadamente. Obter uma amostra das conciliações bancárias concluídas e verificar as assinaturas e datas do preparador e revisor.",
    evidenceRequirements: "Relatório de conciliação bancária assinado, cronogramas de suporte para itens de conciliação e evidência de acompanhamento de itens pendentes.",
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
    evidenceRequirements: "Documentação de revisão de acesso do usuário com aprovações.",
    processo: "Gerenciamento de Acesso de Usuário",
    subProcesso: "Provisionamento de Usuário",
    modalidade: "Automático",
  },
   {
    id: "3",
    controlId: "PRO-012",
    controlName: "Due Diligence de Integridade",
    description: "Contagens cíclicas regulares de estoque para garantir a precisão.",
    controlOwner: "Charlie Brown",
    controlFrequency: "Por Novo Fornecedor",
    controlType: "Preventivo",
    status: "Pendente Aprovação",
    lastUpdated: new Date().toISOString(),
    relatedRisks: ["Perda de Estoque", "Erros de Avaliação de Estoque"],
    testProcedures: "Realizar contagens cíclicas e investigar discrepâncias.",
    evidenceRequirements: "Folhas de contagem cíclica e relatórios de ajuste.",
    processo: "Compras",
    subProcesso: "Gerenciamento de Fornecedores",
    modalidade: "Manual",
  },
];

export const mockChangeRequests: ChangeRequest[] = [
  {
    id: "cr1",
    controlId: "FIN-001", // ID do controle existente
    requestedBy: "John Doe",
    requestDate: new Date(Date.now() - 86400000 * 2).toISOString(),
    changes: {
      description: "Revisão mensal e aprovação das conciliações bancárias pelo gerente financeiro para garantir que todas as transações sejam registradas com precisão. Quaisquer discrepâncias identificadas devem ser resolvidas em 5 dias úteis.",
      controlOwner: "Departamento Financeiro (Gerente)", // Mudança de Dono
      testProcedures: "Verificar a aprovação da conciliação e acompanhar as discrepâncias com mais de 5 dias." // Mudança nos procedimentos
    },
    status: "Pendente",
    comments: "Solicitação inicial para atualizar detalhes do controle com base na nova política.",
  },
  {
    id: "cr2",
    controlId: "ITG-005", // ID do controle existente
    requestedBy: "Usuário Dono", // Nome do usuário do contexto 'ownerUser'
    requestDate: new Date(Date.now() - 86400000).toISOString(),
    changes: { controlOwner: "Peter Pan" },
    status: "Pendente",
  },
  {
    id: "cr3",
    controlId: "NEW-CTRL-001", // ID temporário para um novo controle
    requestedBy: "Alice Brown",
    requestDate: new Date().toISOString(),
    changes: { // Todos os campos necessários para um novo controle
        controlId: "OPS-010", // ID definitivo proposto
        controlName: "Novo Controle Operacional de Teste",
        description: "Detalhes abrangentes para o novo controle operacional proposto.",
        controlOwner: "Equipe de Operações",
        controlFrequency: "Diário",
        controlType: "Preventivo",
        status: "Rascunho", // Status inicial de um novo controle proposto
        lastUpdated: new Date().toISOString(),
        relatedRisks: ["Risco Operacional X", "Risco de Conformidade Y"],
        testProcedures: "Procedimentos de teste a serem definidos após aprovação.",
        evidenceRequirements: "Requisitos de evidência a serem definidos.",
        processo: "Operações Diárias",
        subProcesso: "Monitoramento de Produção",
        modalidade: "Híbrido",
    },
    status: "Pendente",
    comments: "Proposta de novo controle para monitoramento de produção."
  },
  { // Solicitação pendente para o controle FIN-001, para ser usada na página de detalhes do controle
    id: "cr-fin001-pending",
    controlId: "FIN-001",
    requestedBy: "Carlos Pereira",
    requestDate: new Date(Date.now() - 86400000 * 1).toISOString(), // 1 dia atrás
    changes: {
        description: "Nova descrição proposta: Revisão e aprovação DIÁRIA das conciliações bancárias pelo gerente financeiro para garantir que todas as transações sejam registradas com precisão e quaisquer discrepâncias sejam identificadas e resolvidas em tempo hábil, com foco em transações de alto valor.",
        controlFrequency: "Diário",
    },
    status: "Pendente",
    comments: "Atualização para refletir a nova política de revisão diária e foco em transações de alto risco."
  }
];


export const mockVersionHistory: VersionHistoryEntry[] = [
  { id: "vh1", controlId: "1", changeDate: new Date(Date.now() - 86400000 * 10).toISOString(), changedBy: "Usuário Admin", summaryOfChanges: "Controle criado.", previousValues: {}, newValues: { controlName: "Revisão de Conciliação Bancária" } },
  { id: "vh2", controlId: "1", changeDate: new Date(Date.now() - 86400000 * 7).toISOString(), changedBy: "Maria Santos", summaryOfChanges: "Descrição e dono atualizados.", previousValues: { description: "Desc. inicial", controlOwner: "Dono Antigo" }, newValues: { description: mockSoxControls.find(c => c.id === "1")?.description, controlOwner: "João Silva" } },
  { id: "vh3", controlId: "2", changeDate: new Date(Date.now() - 86400000 * 8).toISOString(), changedBy: "Usuário Admin", summaryOfChanges: "Controle ITG-005 criado.", previousValues: {}, newValues: { controlName: "Aprovação de Acesso ao Sistema" } },
  { id: "vh4", controlId: "3", changeDate: new Date(Date.now() - 86400000 * 2).toISOString(), changedBy: "Carlos Pereira", summaryOfChanges: "Status alterado para Pendente Aprovação.", previousValues: { status: "Rascunho" }, newValues: { status: "Pendente Aprovação" } },
];

export const mockEvidenceFiles: EvidenceFile[] = [
  { id: "ev1", controlId: "1", fileName: "Q1_Conciliacao_Bancaria_Assinada.pdf", fileType: "application/pdf", fileSize: 1024 * 250, uploadDate: new Date(Date.now() - 86400000 * 3).toISOString(), uploadedBy: "João Silva", storageUrl: "#" },
  { id: "ev2", controlId: "1", fileName: "Itens_Conciliacao_Q1.xlsx", fileType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileSize: 1024 * 80, uploadDate: new Date(Date.now() - 86400000 * 3).toISOString(), uploadedBy: "João Silva", storageUrl: "#" },
  { id: "ev3", controlId: "2", fileName: "Aprovacao_Acesso_Q3.docx", fileType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", fileSize: 1024 * 120, uploadDate: new Date(Date.now() - 86400000 * 5).toISOString(), uploadedBy: "Bob The Builder", storageUrl: "#" },
];

// Mock data for filters in sox-matrix page
export const mockProcessos = ["Todos", "Relatórios Financeiros", "Gerenciamento de Acesso de Usuário", "Compras", "Operações Diárias"];
export const mockSubProcessos = ["Todos", "Fechamento Mensal", "Provisionamento de Usuário", "Gerenciamento de Fornecedores", "Monitoramento de Produção"];
export const mockDonos = ["Todos", "Alice Wonderland", "Bob The Builder", "Charlie Brown", "Equipe de Operações", "Departamento Financeiro (Gerente)", "Peter Pan"];

