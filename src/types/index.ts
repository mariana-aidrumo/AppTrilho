export type SoxControlStatus = "Active" | "Inactive" | "Draft" | "Pending Approval";

export interface SoxControl {
  id: string;
  controlId: string; // e.g., "FIN-001"
  controlName: string;
  description: string;
  controlOwner: string; // User ID or name
  controlFrequency: "Daily" | "Weekly" | "Monthly" | "Quarterly" | "Annually" | "Ad-hoc";
  controlType: "Preventive" | "Detective" | "Corrective";
  status: SoxControlStatus;
  lastUpdated: string; // ISO date string
  relatedRisks: string[];
  testProcedures: string;
  evidenceRequirements: string;
}

export interface ChangeRequest {
  id: string;
  controlId: string; // ID of the SoxControl being changed
  requestedBy: string; // User ID or name
  requestDate: string; // ISO date string
  changes: Partial<SoxControl>; // The proposed changes
  status: "Pending" | "Approved" | "Rejected";
  reviewedBy?: string; // User ID or name
  reviewDate?: string; // ISO date string
  comments?: string;
}

export interface VersionHistoryEntry {
  id: string;
  controlId: string;
  changeDate: string; // ISO date string
  changedBy: string; // User ID or name
  summaryOfChanges: string;
  previousValues: Partial<SoxControl>;
  newValues: Partial<SoxControl>;
}

export interface EvidenceFile {
  id: string;
  controlId: string;
  fileName: string;
  fileType: string;
  fileSize: number; // in bytes
  uploadDate: string; // ISO date string
  uploadedBy: string; // User ID or name
  storageUrl: string; // URL to the file in storage
}
