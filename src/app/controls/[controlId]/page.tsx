// This page will likely need to be a client component or have client components
// for interactive parts like forms, version history toggles, evidence uploads.
// For now, it's a server component displaying mock data.

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { SoxControl, VersionHistoryEntry, EvidenceFile, ChangeRequest } from "@/types";
import { ArrowLeft, Edit2, History, Paperclip, PlusCircle } from "lucide-react";
import Link from "next/link";

// Mock data for a single control
const mockControl: SoxControl = {
  id: "1",
  controlId: "FIN-001",
  controlName: "Bank Reconciliation Review",
  description: "Monthly review and approval of bank reconciliations by the finance manager to ensure all transactions are accurately recorded and any discrepancies are identified and resolved in a timely manner.",
  controlOwner: "John Doe, Finance Department",
  controlFrequency: "Monthly",
  controlType: "Detective",
  status: "Active",
  lastUpdated: new Date(Date.now() - 86400000 * 5).toISOString(), // 5 days ago
  relatedRisks: ["Financial Misstatement", "Fraudulent Transactions", "Unrecorded Liabilities"],
  testProcedures: "Verify that bank reconciliations are performed monthly, independently reviewed, and all reconciling items are investigated and cleared appropriately. Obtain a sample of completed bank reconciliations and check for preparer and reviewer signatures and dates.",
  evidenceRequirements: "Signed bank reconciliation report, supporting schedules for reconciling items, and evidence of follow-up on outstanding items.",
};

const mockVersionHistory: VersionHistoryEntry[] = [
  { id: "vh1", controlId: "1", changeDate: new Date(Date.now() - 86400000 * 10).toISOString(), changedBy: "Admin User", summaryOfChanges: "Control created.", previousValues: {}, newValues: { controlName: "Bank Reconciliation Review" } },
  { id: "vh2", controlId: "1", changeDate: new Date(Date.now() - 86400000 * 7).toISOString(), changedBy: "Jane Smith", summaryOfChanges: "Updated description and owner.", previousValues: { description: "Initial desc.", controlOwner: "Old Owner" }, newValues: { description: mockControl.description, controlOwner: "John Doe" } },
];

const mockEvidence: EvidenceFile[] = [
  { id: "ev1", controlId: "1", fileName: "Q1_Bank_Recon_Signed.pdf", fileType: "application/pdf", fileSize: 1024 * 250, uploadDate: new Date(Date.now() - 86400000 * 3).toISOString(), uploadedBy: "John Doe", storageUrl: "#" },
  { id: "ev2", controlId: "1", fileName: "Reconciling_Items_Q1.xlsx", fileType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileSize: 1024 * 80, uploadDate: new Date(Date.now() - 86400000 * 3).toISOString(), uploadedBy: "John Doe", storageUrl: "#" },
];

// This page might show pending change requests for this specific control
const mockPendingChangeForThisControl: ChangeRequest | null = null; 
// Example:
// const mockPendingChangeForThisControl: ChangeRequest | null = {
//   id: "cr_fin001",
//   controlId: "1",
//   requestedBy: "John Doe",
//   requestDate: new Date().toISOString(),
//   changes: { testProcedures: "Updated test procedures with new sampling method." },
//   status: "Pending",
// };


interface ControlDetailPageProps {
  params: {
    controlId: string;
  };
}

export default function ControlDetailPage({ params }: ControlDetailPageProps) {
  // In a real app, fetch control data based on params.controlId
  const control = mockControl; // Using mock data

  if (!control) {
    return <p>Control not found.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" asChild>
          <Link href="/sox-matrix">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to SOX Matrix
          </Link>
        </Button>
        {/* Button to request change - could open a modal or navigate to a form */}
        <Button>
          <Edit2 className="mr-2 h-4 w-4" /> Request Change
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{control.controlId}: {control.controlName}</CardTitle>
              <CardDescription>Last Updated: {new Date(control.lastUpdated).toLocaleDateString()}</CardDescription>
            </div>
            <span className={`px-3 py-1.5 text-sm font-semibold rounded-full ${
              control.status === "Active" ? "bg-green-100 text-green-700" :
              control.status === "Pending Approval" ? "bg-yellow-100 text-yellow-700" :
              control.status === "Inactive" ? "bg-red-100 text-red-700" :
              "bg-gray-100 text-gray-700"
            }`}>
              {control.status}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold text-muted-foreground">Description</h3>
            <p className="text-sm">{control.description}</p>
          </div>
          <Separator />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h3 className="font-semibold text-muted-foreground">Owner</h3>
              <p className="text-sm">{control.controlOwner}</p>
            </div>
            <div>
              <h3 className="font-semibold text-muted-foreground">Frequency</h3>
              <p className="text-sm">{control.controlFrequency}</p>
            </div>
            <div>
              <h3 className="font-semibold text-muted-foreground">Type</h3>
              <p className="text-sm">{control.controlType}</p>
            </div>
          </div>
          <Separator />
           <div>
            <h3 className="font-semibold text-muted-foreground">Related Risks</h3>
            {control.relatedRisks.length > 0 ? (
              <ul className="list-disc list-inside text-sm">
                {control.relatedRisks.map(risk => <li key={risk}>{risk}</li>)}
              </ul>
            ) : <p className="text-sm text-muted-foreground">No related risks specified.</p>}
          </div>
          <Separator />
          <div>
            <h3 className="font-semibold text-muted-foreground">Test Procedures</h3>
            <p className="text-sm whitespace-pre-wrap">{control.testProcedures}</p>
          </div>
          <Separator />
          <div>
            <h3 className="font-semibold text-muted-foreground">Evidence Requirements</h3>
            <p className="text-sm whitespace-pre-wrap">{control.evidenceRequirements}</p>
          </div>
        </CardContent>
      </Card>

      {mockPendingChangeForThisControl && (
        <Card className="border-yellow-400 bg-yellow-50">
            <CardHeader>
                <CardTitle className="text-lg text-yellow-700">Pending Change Request</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm"><strong>Requested by:</strong> {mockPendingChangeForThisControl.requestedBy} on {new Date(mockPendingChangeForThisControl.requestDate).toLocaleDateString()}</p>
                <p className="text-sm mt-1"><strong>Changes:</strong></p>
                <ul className="list-disc list-inside text-sm ml-4">
                    {Object.entries(mockPendingChangeForThisControl.changes).map(([key, value]) => (
                        <li key={key}><strong>{key}:</strong> {String(value)}</li>
                    ))}
                </ul>
                 <div className="mt-4 flex justify-end">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/pending-approvals?requestId=${mockPendingChangeForThisControl.id}`}>View Request</Link>
                    </Button>
                 </div>
            </CardContent>
        </Card>
      )}

      {/* Version History Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><History className="w-5 h-5" /> Version History</CardTitle>
        </CardHeader>
        <CardContent>
          {mockVersionHistory.length > 0 ? (
            <ul className="space-y-3">
              {mockVersionHistory.map(entry => (
                <li key={entry.id} className="text-sm border-l-2 pl-3 border-primary/50">
                  <p><strong>{new Date(entry.changeDate).toLocaleString()}</strong> by {entry.changedBy}</p>
                  <p className="text-muted-foreground">{entry.summaryOfChanges}</p>
                  {/* Optionally show previous/new values on expand */}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No version history available for this control.</p>
          )}
        </CardContent>
      </Card>

      {/* Evidence Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Paperclip className="w-5 h-5" /> Evidence</CardTitle>
          <Button variant="outline" size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Upload Evidence</Button>
        </CardHeader>
        <CardContent>
          {mockEvidence.length > 0 ? (
            <ul className="space-y-2">
              {mockEvidence.map(file => (
                <li key={file.id} className="text-sm flex justify-between items-center p-2 border rounded-md hover:bg-muted/50">
                  <div>
                    <Link href={file.storageUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{file.fileName}</Link>
                    <p className="text-xs text-muted-foreground">
                      {(file.fileSize / (1024*1024)).toFixed(2)} MB - Uploaded by {file.uploadedBy} on {new Date(file.uploadDate).toLocaleDateString()}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">Download</Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No evidence uploaded for this control.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
