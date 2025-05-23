import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ChangeRequest } from "@/types";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Eye } from "lucide-react";
import Link from "next/link";

// Dados mocados para demonstração
const mockChangeRequests: ChangeRequest[] = [
  {
    id: "cr1",
    controlId: "FIN-001",
    requestedBy: "John Doe",
    requestDate: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 dias atrás
    changes: { description: "Descrição atualizada para conciliação bancária." },
    status: "Pendente",
  },
  {
    id: "cr2",
    controlId: "IT-005",
    requestedBy: "Jane Smith",
    requestDate: new Date(Date.now() - 86400000).toISOString(), // 1 dia atrás
    changes: { controlOwner: "Peter Pan" },
    status: "Pendente",
  },
  {
    id: "cr3",
    controlId: "NEW-CTRL-001", // Pode ser uma solicitação de novo controle
    requestedBy: "Alice Brown",
    requestDate: new Date().toISOString(),
    changes: { controlName: "Novo Controle Operacional", description: "Detalhes para novo controle...", controlId: "OPS-010" }, // Exemplo de submissão de novo controle
    status: "Pendente",
  }
];

export default function PendingApprovalsPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Solicitações Pendentes</CardTitle>
          <CardDescription>
            Revise e aprove ou rejeite as solicitações de alteração pendentes para controles internos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mockChangeRequests.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Controle / Solicitação</TableHead>
                    <TableHead>Solicitado Por</TableHead>
                    <TableHead>Data da Solicitação</TableHead>
                    <TableHead>Resumo da Mudança</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockChangeRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">
                        <Link href={`/change-requests/${request.id}`} className="text-primary hover:underline">
                          {request.controlId.startsWith("NEW-CTRL") ? `Novo: ${request.changes.controlId || 'N/A'}` : request.controlId}
                        </Link>
                        <div className="text-xs text-muted-foreground">ID: {request.id}</div>
                      </TableCell>
                      <TableCell>{request.requestedBy}</TableCell>
                      <TableCell>{new Date(request.requestDate).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {Object.keys(request.changes).join(', ')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-1">
                          <Button variant="ghost" size="icon" asChild title="Ver Detalhes">
                            <Link href={`/change-requests/${request.id}`}><Eye className="h-4 w-4" /></Link>
                          </Button>
                          <Button variant="ghost" size="icon" className="text-green-600 hover:text-green-700" title="Aprovar">
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700" title="Rejeitar">
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
            <p className="mt-4 text-center text-muted-foreground">Nenhuma solicitação pendente.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
