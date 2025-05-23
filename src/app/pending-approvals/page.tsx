
// src/app/pending-approvals/page.tsx
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ChangeRequest } from "@/types"; // SoxControl, VersionHistoryEntry no longer needed here
import { Button } from "@/components/ui/button";
import { Eye, MessageSquareWarning, Edit2, HistoryIcon, AlertTriangle, FileText, PlusSquare, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useUserProfile } from "@/contexts/user-profile-context";
import { mockChangeRequests } from "@/data/mock-data"; // mockSoxControls, mockVersionHistory no longer needed here
// import { useToast } from "@/hooks/use-toast"; // No longer needed here
import { useMemo } from "react";

export default function PendingApprovalsPage() {
  const { currentUser, isUserAdmin, isUserControlOwner } = useUserProfile();
  // const { toast } = useToast(); // No longer needed here
  // const [dataVersion, setDataVersion] = useState(0); // No longer needed for quick actions

  // const forceRerender = () => setDataVersion(prev => prev + 1); // No longer needed for quick actions

  // handleQuickAdminAction is removed as all actions are now on the details page.


  // Filtros para Administrador
  const adminPendingAlterations = useMemo(() => mockChangeRequests.filter(req => 
    !req.controlId.startsWith("NEW-CTRL-") && req.status === "Pendente"
  ), [mockChangeRequests]); // dataVersion removed from dependencies

  const adminPendingNewControls = useMemo(() => mockChangeRequests.filter(req => 
    req.controlId.startsWith("NEW-CTRL-") && req.status === "Pendente"
  ), [mockChangeRequests]); // dataVersion removed from dependencies


  // Filtros para Dono do Controle
  const ownerPendingApprovalRequests = useMemo(() => mockChangeRequests.filter(
    req => req.requestedBy === currentUser.name && (req.status === "Pendente" || req.status === "Em Análise")
  ), [mockChangeRequests, currentUser.name]); // dataVersion removed from dependencies

  const ownerAwaitingFeedbackRequests = useMemo(() => mockChangeRequests.filter(
    req => req.requestedBy === currentUser.name && req.status === "Aguardando Feedback do Dono"
  ), [mockChangeRequests, currentUser.name]); // dataVersion removed from dependencies

  const ownerRequestsHistory = useMemo(() => mockChangeRequests.filter(
    req => req.requestedBy === currentUser.name && (req.status === "Aprovado" || req.status === "Rejeitado")
  ), [mockChangeRequests, currentUser.name]); // dataVersion removed from dependencies

  const pageTitle = isUserAdmin() ? "Aprovações Pendentes" : "Minhas Solicitações";
  const pageDescription = isUserAdmin()
    ? "Revise e aprove ou rejeite as solicitações de alteração e criação de controles."
    : "Acompanhe o status das suas propostas e alterações de controles internos.";

  const renderRequestTable = (requests: ChangeRequest[], context: "admin-alterations" | "admin-new" | "owner-pending" | "owner-feedback" | "owner-history") => {
    if (requests.length === 0) {
      let message = "Nenhuma solicitação encontrada para esta categoria.";
      if (context === "admin-alterations" && isUserAdmin()) message = "Nenhuma solicitação de alteração pendente de aprovação.";
      else if (context === "admin-new" && isUserAdmin()) message = "Nenhuma solicitação de criação de novo controle pendente.";
      else if (context === "owner-pending") message = "Você não possui solicitações pendentes de aprovação.";
      else if (context === "owner-feedback") message = "Nenhuma solicitação aguardando sua ação.";
      else if (context === "owner-history") message = "Nenhuma solicitação no seu histórico.";
      return <p className="mt-4 text-center text-muted-foreground">{message}</p>;
    }

    const isAdminContext = context === "admin-alterations" || context === "admin-new";

    return (
      <div className="rounded-md border mt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{isAdminContext ? "ID Controle/Proposta" : "ID Proposta / Controle"}</TableHead>
              {!isAdminContext && <TableHead>Data da Solicitação</TableHead>}
              {isAdminContext && <TableHead>Solicitado Por</TableHead>}
              {isAdminContext && <TableHead>Data da Solicitação</TableHead>}
              
              {(context === "owner-pending" || isAdminContext) && <TableHead>Resumo da Mudança/Proposta</TableHead>}
              {context === "owner-pending" && <TableHead>Status Atual</TableHead>}

              {context === "owner-feedback" && <TableHead>Feedback do Admin</TableHead>}
              
              {context === "owner-history" && <TableHead>Status Final</TableHead>}
              {context === "owner-history" && <TableHead>Revisado Por</TableHead>}
              {context === "owner-history" && <TableHead>Data Decisão</TableHead>}
              
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell className="font-medium">
                  <Link href={`/change-requests/${request.id}`} className="text-primary hover:underline">
                    {request.controlId.startsWith("NEW-CTRL") ? `Novo: ${request.changes.controlId || 'ID pendente'}` : request.controlId}
                  </Link>
                  <div className="text-xs text-muted-foreground">ID Sol.: {request.id}</div>
                </TableCell>

                {!isAdminContext && <TableCell>{new Date(request.requestDate).toLocaleDateString('pt-BR')}</TableCell>}
                {isAdminContext && <TableCell>{request.requestedBy}</TableCell>}
                {isAdminContext && <TableCell>{new Date(request.requestDate).toLocaleDateString('pt-BR')}</TableCell>}
                
                {(context === "owner-pending" || isAdminContext) && (
                  <TableCell className="max-w-xs truncate">
                    {request.controlId.startsWith("NEW-CTRL") ? `Proposta: ${request.changes.controlName}` : 
                     Object.keys(request.changes).map(key => key).join(', ')}
                  </TableCell>
                )}

                {context === "owner-pending" && (
                  <TableCell>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        request.status === "Pendente" ? "bg-yellow-100 text-yellow-700" :
                        request.status === "Em Análise" ? "bg-blue-100 text-blue-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {request.status}
                      </span>
                  </TableCell>
                )}

                {context === "owner-feedback" && (
                  <TableCell className="max-w-xs italic text-sm">
                    {request.adminFeedback || "Nenhum feedback específico."}
                     <div className="mt-1">
                        <Link href={`/change-requests/${request.id}`} className="text-xs text-primary hover:underline">Ver detalhes e responder</Link>
                    </div>
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
                
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-1">
                    <Button variant="ghost" size="icon" asChild title="Ver Detalhes">
                      <Link href={`/change-requests/${request.id}`}><Eye className="h-4 w-4" /></Link>
                    </Button>
                    {/* Botões de ação rápida para Admin removidos. Ações devem ser feitas na página de detalhes. */}
                    {context === "owner-feedback" && (
                         <Button variant="outline" size="sm" asChild title="Revisar e Reenviar" 
                            className="border-orange-500 text-orange-600 hover:bg-orange-100 hover:text-orange-700">
                            {/* Idealmente, esta ação levaria para um formulário de edição da proposta original */}
                            <Link href={`/change-requests/${request.id}`}> <Edit2 className="h-4 w-4 mr-1" /> Revisar</Link>
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
          {isUserAdmin() && (
            <Tabs defaultValue="alterations">
              <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2">
                <TabsTrigger value="alterations">
                  <FileText className="mr-2 h-4 w-4 text-blue-600" /> Alterações de Controles ({adminPendingAlterations.length})
                </TabsTrigger>
                <TabsTrigger value="new_controls">
                  <PlusSquare className="mr-2 h-4 w-4 text-green-600" /> Criação de Novos Controles ({adminPendingNewControls.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="alterations">
                {renderRequestTable(adminPendingAlterations, "admin-alterations")}
              </TabsContent>
              <TabsContent value="new_controls">
                {renderRequestTable(adminPendingNewControls, "admin-new")}
              </TabsContent>
            </Tabs>
          )}
          
          {isUserControlOwner() && (
            <Tabs defaultValue="pendentes">
              <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3">
                <TabsTrigger value="pendentes">
                  <CheckCircle2 className="mr-2 h-4 w-4 text-yellow-600" /> Pendentes de Aprovação ({ownerPendingApprovalRequests.length})
                </TabsTrigger>
                <TabsTrigger value="feedback">
                  <AlertTriangle className="mr-2 h-4 w-4 text-orange-600" />Aguardando Minha Ação ({ownerAwaitingFeedbackRequests.length})
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
    
