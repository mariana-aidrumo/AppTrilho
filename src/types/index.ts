export type SoxControlStatus = "Ativo" | "Inativo" | "Rascunho" | "Pendente Aprovação";
export type ControlFrequency = "Diário" | "Semanal" | "Mensal" | "Trimestral" | "Anual" | "Ad-hoc";
export type ControlType = "Preventivo" | "Detectivo" | "Corretivo";
export type ControlModalidade = "Manual" | "Automático" | "Híbrido";

export interface SoxControl {
  id: string;
  controlId: string; // Ex: "FIN-001"
  controlName: string;
  description: string;
  controlOwner: string; // ID ou nome do usuário
  controlFrequency: ControlFrequency;
  controlType: ControlType;
  status: SoxControlStatus;
  lastUpdated: string; // Data ISO
  relatedRisks: string[];
  testProcedures: string;
  evidenceRequirements: string;
  processo?: string;
  subProcesso?: string;
  modalidade?: ControlModalidade;
  justificativa?: string; // Para novos controles propostos
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
  previousValues?: Partial<SoxControl>; // Use ? para criação de controle
  newValues?: Partial<SoxControl>; // Use ? para deleção ou apenas status
  relatedChangeRequestId?: string; // ID da ChangeRequest que originou esta versão
}

export interface EvidenceFile {
  id: string;
  controlId: string;
  fileName: string;
  fileType: string;
  fileSize: number; // em bytes
  uploadDate: string; // Data ISO
  uploadedBy: string; // ID ou nome do usuário
  storageUrl: string; // URL para o arquivo no armazenamento
}

export type UserProfileType = "Dono do Controle" | "Administrador de Controles Internos";

export interface UserProfile {
  name: string;
  profile: UserProfileType;
  controlsOwned?: string[];
}
