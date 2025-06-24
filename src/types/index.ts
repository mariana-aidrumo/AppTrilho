
export type SoxControlStatus = "Ativo" | "Inativo" | "Rascunho" | "Pendente Aprovação";
export type ControlFrequency = "Diário" | "Semanal" | "Mensal" | "Trimestral" | "Anual" | "Ad-hoc" | "Por ocorrência";
export type ControlType = "Preventivo" | "Detectivo" | "Corretivo";
export type ControlModalidade = "Manual" | "Automático" | "Híbrido" | "ITDM";

export interface IPEAssertions {
  C: boolean;
  EO: boolean;
  VA: boolean;
  OR: boolean;
  PD: boolean;
}

export interface SoxControl {
  id: string;
  controlId: string; // Ex: "FIN-001" / "Código NOVO"
  controlName: string;
  description: string; // "Descrição do controle ATUAL"
  controlOwner: string; // "Dono do Controle (Control owner)"
  controlFrequency: ControlFrequency;
  controlType: ControlType; // P/D
  status: SoxControlStatus;
  lastUpdated: string; // Data ISO
  
  // Fields from previous versions, can be used for other controls
  relatedRisks?: string[];
  testProcedures?: string;
  justificativa?: string;
  
  // Detailed fields from image
  processo?: string;
  subProcesso?: string;
  modalidade?: ControlModalidade;
  responsavel?: string; // "Responsável"
  n3Responsavel?: string; // "N3 Responsável"
  codigoAnterior?: string;
  matriz?: string;
  riscoId?: string;
  riscoDescricao?: string;
  riscoClassificacao?: string;
  codigoCosan?: string;
  objetivoControle?: string;
  tipo?: string; // e.g. "Chave"
  mrc?: boolean;
  evidenciaControle?: string;
  implementacaoData?: string;
  dataUltimaAlteracao?: string;
  sistemasRelacionados?: string[];
  transacoesTelasMenusCriticos?: string;
  aplicavelIPE?: boolean;
  ipeAssertions?: IPEAssertions;
  executorControle?: string[];
  executadoPor?: string;
  area?: string;
  vpResponsavel?: string;
  impactoMalhaSul?: boolean;
  sistemaArmazenamento?: string;
}

export type ChangeRequestStatus = "Pendente" | "Aprovado" | "Rejeitado" | "Em Análise" | "Aguardando Feedback do Dono";

export interface ChangeRequest {
  id: string;
  controlId: string; // ID do SoxControl sendo alterado, ou um ID temporário para novos controles
  requestedBy: string; // ID ou nome do usuário
  requestDate: string; // Data ISO
  changes: Partial<SoxControl>; // As alterações propostas, ou campos para novo controle
  status: ChangeRequestStatus;
  reviewedBy?: string; // ID ou nome do usuário que revisou (Admin)
  reviewDate?: string; // Data ISO da revisão
  comments?: string; // Comentários do solicitante
  adminFeedback?: string; // Feedback do admin para o Dono do Controle
}

export interface VersionHistoryEntry {
  id: string;
  controlId: string; // ID do SoxControl
  changeDate: string; // Data ISO
  changedBy: string; // ID ou nome do usuário
  summaryOfChanges: string; // Resumo das alterações
  previousValues?: Partial<SoxControl>;
  newValues?: Partial<SoxControl>;
  relatedChangeRequestId?: string; // ID da ChangeRequest que originou esta versão
}

export type UserProfileType = "Dono do Controle" | "Administrador de Controles Internos";

export interface UserProfile {
  name: string;
  profile: UserProfileType;
  controlsOwned?: string[];
}

export type UnifiedHistoryEventType =
  | "CONTROL_CREATED"
  | "CONTROL_UPDATED"
  | "CHANGE_REQUEST_SUBMITTED"
  | "CHANGE_REQUEST_APPROVED"
  | "CHANGE_REQUEST_REJECTED"
  | "CHANGE_REQUEST_FEEDBACK_REQUESTED";

export interface UnifiedHistoryItem {
  id: string;
  date: string;
  type: UnifiedHistoryEventType;
  description: string;
  actor: string;
  sourceId?: string;
}

export interface Notification {
  id: string;
  userId: string; // ID do usuário a quem a notificação pertence
  message: string;
  date: string; // Data ISO
  read: boolean;
}
