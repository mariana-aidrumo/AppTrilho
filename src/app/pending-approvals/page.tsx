import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ChangeRequest } from "@/types";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Eye } from "lucide-react";
import Link from "next/link";

// Mock data for demonstration
const mockChangeRequests: ChangeRequest[] = [
  {
    id: "cr1",
    controlId: "FIN-001",
    requestedBy: "John Doe",
    requestDate: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
    changes: { controlDescription: "Updated description for bank reconciliation." },
    status: "Pending",
  },
  {
    id: "cr2",
    controlId: "IT-005",
    requestedBy: "Jane Smith",
    requestDate: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    changes: { controlOwner: "Peter Pan" },
    status: "Pending",
  },
  {
    id: "cr3",
    controlId: "NEW-CTRL-001", // Could be a new control request
    requestedBy: "Alice Brown",
    requestDate: new Date().toISOString(),
    changes: { controlName: "New Operational Control", description: "Details for new control...", controlId: "OPS-010" }, // Example of a new control submission
    status: "Pending",
  }
];

export default function PendingApprovalsPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
          <CardDescription>
            Review and action pending change requests for internal controls.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mockChangeRequests.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Control ID / Request ID</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Request Date</TableHead>
                    <TableHead>Summary of Change</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockChangeRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">
                        <Link href={`/change-requests/${request.id}`} className="text-primary hover:underline">
                          {request.controlId.startsWith("NEW-CTRL") ? `New: ${request.changes.controlId || 'N/A'}` : request.controlId}
                        </Link>
                        <div className="text-xs text-muted-foreground">ID: {request.id}</div>
                      </TableCell>
                      <TableCell>{request.requestedBy}</TableCell>
                      <TableCell>{new Date(request.requestDate).toLocaleDateString()}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {Object.keys(request.changes).join(', ')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-1">
                          <Button variant="ghost" size="icon" asChild title="View Details">
                            <Link href={`/change-requests/${request.id}`}><Eye className="h-4 w-4" /></Link>
                          </Button>
                          <Button variant="ghost" size="icon" className="text-green-600 hover:text-green-700" title="Approve">
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700" title="Reject">
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="mt-4 text-center text-muted-foreground">No pending approvals.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
