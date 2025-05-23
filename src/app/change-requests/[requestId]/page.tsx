import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { ChangeRequest, SoxControl } from "@/types";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";

// Mock data for a single change request
const mockChangeRequest: ChangeRequest = {
  id: "cr1",
  controlId: "FIN-001",
  requestedBy: "John Doe",
  requestDate: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
  changes: { 
    description: "Monthly review and approval of bank reconciliations by the finance manager to ensure all transactions are accurately recorded. Any discrepancies identified must be resolved within 5 business days.",
    controlOwner: "Finance Department (Manager)",
    testProcedures: "Verify reconciliation sign-off and follow up on discrepancies older than 5 days."
  },
  status: "Pending",
  comments: "Initial request for updating control details based on new policy.",
};

// Mock current control data (for comparison)
const mockCurrentControl: Partial<SoxControl> = {
  controlId: "FIN-001",
  controlName: "Bank Reconciliation Review",
  description: "Monthly review and approval of bank reconciliations.",
  controlOwner: "John Doe",
  testProcedures: "Verify reconciliation sign-off."
};


interface ChangeRequestDetailPageProps {
  params: {
    requestId: string;
  };
}

export default function ChangeRequestDetailPage({ params }: ChangeRequestDetailPageProps) {
  // In a real app, fetch change request data based on params.requestId
  // and potentially the current control data for comparison.
  const request = mockChangeRequest;
  const currentControl = mockCurrentControl; // For showing diffs

  if (!request) {
    return <p>Change Request not found.</p>;
  }

  const getChangedFields = () => {
    const changed: { field: string; oldValue?: string; newValue: string }[] = [];
    for (const key in request.changes) {
      if (Object.prototype.hasOwnProperty.call(request.changes, key)) {
        const typedKey = key as keyof SoxControl;
        changed.push({
          field: typedKey,
          oldValue: currentControl[typedKey] as string | undefined,
          newValue: request.changes[typedKey] as string,
        });
      }
    }
    return changed;
  };

  const changedFields = getChangedFields();

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button variant="outline" asChild>
          <Link href="/pending-approvals">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Pending Approvals
          </Link>
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">Change Request Details</CardTitle>
              <CardDescription>
                Review the proposed changes for control: <Link href={`/controls/${request.controlId}`} className="text-primary hover:underline">{request.controlId}</Link>
              </CardDescription>
            </div>
            <span className={`px-3 py-1.5 text-sm font-semibold rounded-full ${
              request.status === "Pending" ? "bg-yellow-100 text-yellow-700" :
              request.status === "Approved" ? "bg-green-100 text-green-700" :
              "bg-red-100 text-red-700"
            }`}>
              {request.status}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold text-muted-foreground">Request ID</h3>
            <p className="text-sm">{request.id}</p>
          </div>
          <Separator />
          <div>
            <h3 className="font-semibold text-muted-foreground">Requested By</h3>
            <p className="text-sm">{request.requestedBy}</p>
          </div>
          <Separator />
          <div>
            <h3 className="font-semibold text-muted-foreground">Request Date</h3>
            <p className="text-sm">{new Date(request.requestDate).toLocaleString()}</p>
          </div>
          <Separator />
          <div>
            <h3 className="font-semibold text-muted-foreground">Requester Comments</h3>
            <p className="text-sm italic">{request.comments || "No comments provided."}</p>
          </div>
          <Separator />
          
          <div>
            <h3 className="font-semibold text-muted-foreground mb-2">Proposed Changes</h3>
            {changedFields.length > 0 ? (
              <div className="space-y-3">
                {changedFields.map(change => (
                  <div key={change.field} className="p-3 border rounded-md bg-muted/30">
                    <p className="text-sm font-medium capitalize">{change.field.replace(/([A-Z])/g, ' $1')}</p>
                    {change.oldValue && (
                        <div className="mt-1 p-2 rounded-sm bg-red-50 text-red-700 text-xs">
                            <strong>Old:</strong> <span className="line-through">{change.oldValue}</span>
                        </div>
                    )}
                    <div className={`mt-1 p-2 rounded-sm bg-green-50 text-green-700 text-xs ${change.oldValue ? '' : 'mt-0'}`}>
                        <strong>New:</strong> {change.newValue}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No specific field changes listed (possibly a new control creation request).</p>
            )}
             {/* For new controls, list all fields */}
            {request.controlId.startsWith("NEW-CTRL") && Object.keys(request.changes).length > 0 && (
                 <div className="mt-4 p-3 border rounded-md bg-blue-50">
                    <p className="text-sm font-medium text-blue-700">New Control Details:</p>
                    <ul className="list-disc list-inside text-sm ml-4 mt-1 text-blue-600">
                         {Object.entries(request.changes).map(([key, value]) => (
                            <li key={key}><strong>{key.replace(/([A-Z])/g, ' $1').trim()}:</strong> {String(value)}</li>
                        ))}
                    </ul>
                 </div>
            )}
          </div>

        </CardContent>
        {request.status === "Pending" && (
            <CardFooter className="flex justify-end space-x-2">
                <Button variant="outline" className="border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600">
                <XCircle className="mr-2 h-4 w-4" /> Reject
                </Button>
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
                </Button>
            </CardFooter>
        )}
      </Card>
    </div>
  );
}
