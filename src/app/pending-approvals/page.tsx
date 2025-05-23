
// src/app/pending-approvals/page.tsx
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ChangeRequest } from "@/types";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Eye } from "lucide-react";
import Link from "next/link";
import { useUserProfile } from "@/contexts/user-profile-context";
import { mockChangeRequests } from "@/data/mock-data";

export default function PendingApprovalsPage() {
  const { currentUser, isUserAdmin, isUserControlOwner } = useUserProfile();

  const pageTitle = isUserControlOwner() ? "Minhas Solicitações Pendentes" : "Solicitações de Alteração Pendentes";
  const pageDescription = isUserControlOwner()
    ? "Visualize e acompanhe suas solicitações de alteração para controles internos."
    : "Revise e aprove ou rejeite as solicitações de alteração pendentes para controles internos.";

  // Para Dono do Controle, filtramos para mostrar apenas suas solicitações.
  // Para Admin, mostramos todas as pendentes.
  const displayedRequests = isUserControlOwner()
    ? mockChangeRequests.filter(req => req.requestedBy === currentUser.name && req.status === "Pendente")
    : mockChangeRequests.filter(req => req.status === "Pendente");


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{pageTitle}</CardTitle>
          <CardDescription>{pageDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          {displayedRequests.length > 0 ? (
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
                  {displayedRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">
                        <Link href={`/change-requests/${request.id}`} className="text-primary hover:underline">
                          {request.controlId.startsWith("NEW-CTRL") ? `Novo: ${request.changes.controlId || 'N/A'}` : request.controlId}
                        </Link>
                        <div className="text-xs text-muted-foreground">ID Sol.: {request.id}</div>
                      </TableCell>
                      <TableCell>{request.requestedBy}</TableCell>
                      <TableCell>{new Date(request.requestDate).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {Object.keys(request.changes).map(key => 
                            key === 'controlId' && request.controlId.startsWith("NEW-CTRL") ? 'Novo Controle' : key
                        ).join(', ')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-1">
                          <Button variant="ghost" size="icon" asChild title="Ver Detalhes">
                            <Link href={`/change-requests/${request.id}`}><Eye className="h-4 w-4" /></Link>
                          </Button>
                          {isUserAdmin() && ( // Apenas Admin pode aprovar/rejeitar diretamente aqui
                            <>
                              <Button variant="ghost" size="icon" className="text-green-600 hover:text-green-700" title="Aprovar">
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700" title="Rejeitar">
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="mt-4 text-center text-muted-foreground">
                {isUserControlOwner() ? "Você não tem solicitações pendentes." : "Nenhuma solicitação pendente."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

