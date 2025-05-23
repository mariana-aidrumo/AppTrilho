import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SoxControl } from "@/types"; // Assuming types are defined
import { Button } from "@/components/ui/button";
import { Eye, Edit2, History, Paperclip } from "lucide-react";
import Link from "next/link";

// Mock data for demonstration
const mockControls: SoxControl[] = [
  {
    id: "1",
    controlId: "FIN-001",
    controlName: "Bank Reconciliation Review",
    description: "Monthly review and approval of bank reconciliations.",
    controlOwner: "John Doe",
    controlFrequency: "Monthly",
    controlType: "Detective",
    status: "Active",
    lastUpdated: new Date().toISOString(),
    relatedRisks: ["Financial Misstatement"],
    testProcedures: "Verify reconciliation sign-off.",
    evidenceRequirements: "Signed bank reconciliation report.",
  },
  {
    id: "2",
    controlId: "IT-005",
    controlName: "User Access Review",
    description: "Quarterly review of user access rights to critical systems.",
    controlOwner: "Jane Smith",
    controlFrequency: "Quarterly",
    controlType: "Preventive",
    status: "Active",
    lastUpdated: new Date().toISOString(),
    relatedRisks: ["Unauthorized Access", "Data Breach"],
    testProcedures: "Sample user access logs and compare against approved roles.",
    evidenceRequirements: "User access review documentation with sign-offs.",
  },
   {
    id: "3",
    controlId: "OPS-002",
    controlName: "Inventory Cycle Count",
    description: "Regular cycle counts of inventory to ensure accuracy.",
    controlOwner: "Alice Brown",
    controlFrequency: "Weekly",
    controlType: "Detective",
    status: "Pending Approval",
    lastUpdated: new Date().toISOString(),
    relatedRisks: ["Inventory Shrinkage", "Stock Valuation Errors"],
    testProcedures: "Perform cycle counts and investigate discrepancies.",
    evidenceRequirements: "Cycle count sheets and adjustment reports.",
  },
];


export default function SoxMatrixPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>SOX Control Matrix</CardTitle>
          <CardDescription>
            View, sort, and filter SOX controls. Click on a control ID for more details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex justify-end">
            <Link href="/new-control">
              <Button>Add New Control</Button>
            </Link>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Control ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockControls.map((control) => (
                  <TableRow key={control.id}>
                    <TableCell className="font-medium">
                      <Link href={`/controls/${control.id}`} className="text-primary hover:underline">
                        {control.controlId}
                      </Link>
                    </TableCell>
                    <TableCell>{control.controlName}</TableCell>
                    <TableCell>{control.controlOwner}</TableCell>
                    <TableCell>{control.controlFrequency}</TableCell>
                    <TableCell>{control.controlType}</TableCell>
                    <TableCell>
                       <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        control.status === "Active" ? "bg-green-100 text-green-700" :
                        control.status === "Pending Approval" ? "bg-yellow-100 text-yellow-700" :
                        "bg-gray-100 text-gray-700"
                       }`}>
                        {control.status}
                       </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button variant="ghost" size="icon" asChild title="View Details">
                          <Link href={`/controls/${control.id}`}><Eye className="h-4 w-4" /></Link>
                        </Button>
                        {/* These actions might eventually be on the detail page */}
                        {/* 
                        <Button variant="ghost" size="icon" asChild title="Request Change">
                           <Link href={`/controls/${control.id}/request-change`}><Edit2 className="h-4 w-4" /></Link>
                        </Button>
                        <Button variant="ghost" size="icon" asChild title="Version History">
                           <Link href={`/controls/${control.id}/history`}><History className="h-4 w-4" /></Link>
                        </Button>
                        <Button variant="ghost" size="icon" asChild title="Evidence">
                           <Link href={`/controls/${control.id}/evidence`}><Paperclip className="h-4 w-4" /></Link>
                        </Button>
                        */}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {mockControls.length === 0 && (
            <p className="mt-4 text-center text-muted-foreground">No controls found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
