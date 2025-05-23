export type SoxControlStatus = "Ativo" | "Inativo" | "Rascunho" | "Pendente Aprovação";
export type ControlFrequency = "Diário" | "Semanal" | "Mensal" | "Trimestral" | "Anual" | "Ad-hoc";
export type ControlType = "Preventivo" | "Detectivo" | "Corretivo";
export type ControlModalidade = "Manual" | "Automático" | "Híbrido"; // Adicionado Híbrido como opção

export interface SoxControl {
  id: string;
  controlId: string; // Ex: "FIN-001"
  controlName: string;
  description: string;
  controlOwner: string; // ID ou nome do usuário
  controlFrequency: ControlFrequency;
  controlType: ControlType; // Este campo pode ser usado para "P/D" se os valores forem mapeados
  status: SoxControlStatus;
  lastUpdated: string; // Data ISO
  relatedRisks: string[];
  testProcedures: string;
  evidenceRequirements: string;

  // Novos campos conforme a imagem
  processo?: string; // Ex: "Relatórios Financeiros"
  subProcesso?: string; // Ex: "Fechamento Mensal"
  modalidade?: ControlModalidade; // Ex: "Manual", "Automático"
  // O campo 'P/D' (Preventivo/Detectivo) da imagem parece ser o mesmo que 'controlType'.
  // Se for diferente, adicione um novo campo: pd?: "Preventivo" | "Detectivo";
}

export type ChangeRequestStatus = "Pendente" | "Aprovado" | "Rejeitado";

export interface ChangeRequest {
  id: string;
  controlId: string; // ID do SoxControl sendo alterado, ou um ID temporário para novos controles
  requestedBy: string; // ID ou nome do usuário
  requestDate: string; // Data ISO
  changes: Partial<SoxControl>; // As alterações propostas
  status: ChangeRequestStatus;
  reviewedBy?: string; // ID ou nome do usuário
  reviewDate?: string; // Data ISO
  comments?: string; // Comentários do solicitante ou revisor
}

export interface VersionHistoryEntry {
  id: string;
  controlId: string;
  changeDate: string; // Data ISO
  changedBy: string; // ID ou nome do usuário
  summaryOfChanges: string; // Resumo das alterações
  previousValues: Partial<SoxControl>;
  newValues: Partial<SoxControl>;
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
