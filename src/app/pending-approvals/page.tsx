
// src/app/pending-approvals/page.tsx
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ChangeRequest } from "@/types";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Eye, MessageSquareWarning, Edit2, HistoryIcon } from "lucide-react";
import Link from "next/link";
import { useUserProfile } from "@/contexts/user-profile-context";
import { mockChangeRequests } from "@/data/mock-data";

export default function PendingApprovalsPage() {
  const { currentUser, isUserAdmin, isUserControlOwner } = useUserProfile();

  const adminPendingRequests = mockChangeRequests.filter(req => req.status === "Pendente");

  const ownerPendingApprovalRequests = mockChangeRequests.filter(
    req => req.requestedBy === currentUser.name && (req.status === "Pendente" || req.status === "Em Análise")
  );
  const ownerAwaitingFeedbackRequests = mockChangeRequests.filter(
    req => req.requestedBy === currentUser.name && req.status === "Aguardando Feedback do Dono"
  );
  const ownerRequestsHistory = mockChangeRequests.filter(
    req => req.requestedBy === currentUser.name && (req.status === "Aprovado" || req.status === "Rejeitado")
  );

  const pageTitle = isUserAdmin() ? "Solicitações de Alteração Pendentes" : "Minhas Solicitações";
  const pageDescription = isUserAdmin()
    ? "Revise e aprove ou rejeite as solicitações de alteração pendentes para controles internos."
    : "Acompanhe o status das suas propostas e alterações de controles internos.";

  const renderRequestTable = (requests: ChangeRequest[], context: "admin" | "owner-pending" | "owner-feedback" | "owner-history") => {
    if (requests.length === 0) {
      let message = "Nenhuma solicitação encontrada para esta categoria.";
      if (context === "admin") message = "Nenhuma solicitação pendente no momento.";
      if (context === "owner-pending") message = "Você não possui solicitações pendentes de aprovação.";
      if (context === "owner-feedback") message = "Nenhuma solicitação aguardando sua ação.";
      if (context === "owner-history") message = "Nenhuma solicitação no seu histórico.";
      return <p className="mt-4 text-center text-muted-foreground">{message}</p>;
    }

    return (
      <div className="rounded-md border mt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID Controle / Proposta</TableHead>
              {context !== "admin" && <TableHead>Data da Solicitação</TableHead>}
              {context === "admin" && <TableHead>Solicitado Por</TableHead>}
              {context === "admin" && <TableHead>Data da Solicitação</TableHead>}
              
              {context === "owner-pending" && <TableHead>Resumo da Mudança</TableHead>}
              {context === "owner-pending" && <TableHead>Status Atual</TableHead>}

              {context === "owner-feedback" && <TableHead>Feedback do Admin</TableHead>}
              
              {context === "owner-history" && <TableHead>Status Final</TableHead>}
              {context === "owner-history" && <TableHead>Revisado Por</TableHead>}
              {context === "owner-history" && <TableHead>Data Decisão</TableHead>}

              {context === "admin" && <TableHead>Resumo da Mudança</TableHead>}
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell className="font-medium">
                  <Link href={`/change-requests/${request.id}`} className="text-primary hover:underline">
                    {request.controlId.startsWith("NEW-CTRL") ? `Novo: ${request.changes.controlId || 'ID Pendente'}` : request.controlId}
                  </Link>
                  <div className="text-xs text-muted-foreground">ID Sol.: {request.id}</div>
                </TableCell>

                {context !== "admin" && <TableCell>{new Date(request.requestDate).toLocaleDateString('pt-BR')}</TableCell>}
                {context === "admin" && <TableCell>{request.requestedBy}</TableCell>}
                {context === "admin" && <TableCell>{new Date(request.requestDate).toLocaleDateString('pt-BR')}</TableCell>}
                
                {context === "owner-pending" && (
                  <>
                    <TableCell className="max-w-xs truncate">
                      {request.controlId.startsWith("NEW-CTRL-") ? "Proposta de Novo Controle" : 
                       Object.keys(request.changes).map(key => key).join(', ')}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          request.status === "Pendente" ? "bg-yellow-100 text-yellow-700" :
                          request.status === "Em Análise" ? "bg-blue-100 text-blue-700" :
                          "bg-gray-100 text-gray-700"
                        }`}>
                          {request.status}
                        </span>
                    </TableCell>
                  </>
                )}

                {context === "owner-feedback" && (
                  <TableCell className="max-w-xs italic text-sm">
                    {request.adminFeedback || "Nenhum feedback específico."}
                  </TableCell>
                )}

                {context === "owner-history" && (
                  <>
                    <TableCell>
                       <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          request.status === "Aprovado" ? "bg-green-100 text-green-700" :
                          request.status === "Rejeitado" ? "bg-red-100 text-red-700" :
                          "bg-gray-100 text-gray-700"
                        }`}>
                          {request.status}
                        </span>
                    </TableCell>
                    <TableCell>{request.reviewedBy || "N/A"}</TableCell>
                    <TableCell>{request.reviewDate ? new Date(request.reviewDate).toLocaleDateString('pt-BR') : "N/A"}</TableCell>
                  </>
                )}
                
                {context === "admin" && (
                    <TableCell className="max-w-xs truncate">
                        {Object.keys(request.changes).map(key => 
                            key === 'controlId' && request.controlId.startsWith("NEW-CTRL") ? 'Novo Controle' : key
                        ).join(', ')}
                    </TableCell>
                )}

                <TableCell className="text-right">
                  <div className="flex justify-end space-x-1">
                    <Button variant="ghost" size="icon" asChild title="Ver Detalhes">
                      <Link href={`/change-requests/${request.id}`}><Eye className="h-4 w-4" /></Link>
                    </Button>
                    {context === "admin" && (
                      <>
                        <Button variant="ghost" size="icon" className="text-green-600 hover:text-green-700" title="Aprovar (Simulado)">
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700" title="Rejeitar (Simulado)">
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {context === "owner-feedback" && (
                         <Button variant="outline" size="sm" asChild title="Revisar e Reenviar (Simulado)">
                            <Link href={`/change-requests/${request.id}?edit=true`}> <Edit2 className="h-4 w-4 mr-1" /> Revisar</Link>
                         </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{pageTitle}</CardTitle>
          <CardDescription>{pageDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          {isUserAdmin() && renderRequestTable(adminPendingRequests, "admin")}
          
          {isUserControlOwner() && (
            <Tabs defaultValue="pendentes">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="pendentes">
                  <CheckCircle2 className="mr-2 h-4 w-4 text-yellow-600" /> Pendentes de Aprovação ({ownerPendingApprovalRequests.length})
                </TabsTrigger>
                <TabsTrigger value="feedback">
                  <MessageSquareWarning className="mr-2 h-4 w-4 text-blue-600" />Aguardando Minha Ação ({ownerAwaitingFeedbackRequests.length})
                </TabsTrigger>
                <TabsTrigger value="historico">
                  <HistoryIcon className="mr-2 h-4 w-4 text-gray-600" />Histórico ({ownerRequestsHistory.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="pendentes">
                {renderRequestTable(ownerPendingApprovalRequests, "owner-pending")}
              </TabsContent>
              <TabsContent value="feedback">
                {renderRequestTable(ownerAwaitingFeedbackRequests, "owner-feedback")}
              </TabsContent>
              <TabsContent value="historico">
                {renderRequestTable(ownerRequestsHistory, "owner-history")}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
    