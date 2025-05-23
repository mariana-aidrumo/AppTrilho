
// src/app/pending-approvals/page.tsx
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ChangeRequest, SoxControl, VersionHistoryEntry } from "@/types";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Eye, MessageSquareWarning, Edit2, HistoryIcon, AlertTriangle, FileText, PlusSquare } from "lucide-react";
import Link from "next/link";
import { useUserProfile } from "@/contexts/user-profile-context";
import { mockChangeRequests, mockSoxControls, mockVersionHistory } from "@/data/mock-data";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo } from "react";

export default function PendingApprovalsPage() {
  const { currentUser, isUserAdmin, isUserControlOwner } = useUserProfile();
  const { toast } = useToast();
  const [dataVersion, setDataVersion] = useState(0);

  const forceRerender = () => setDataVersion(prev => prev + 1);


  const handleQuickAdminAction = (requestId: string, action: "approve" | "reject") => {
    const requestIndex = mockChangeRequests.findIndex(r => r.id === requestId);
    if (requestIndex === -1) {
      toast({ title: "Erro", description: "Solicitação não encontrada.", variant: "destructive" });
      return;
    }

    const request = mockChangeRequests[requestIndex];
    let toastMessage = "";

    if (action === "approve") {
      mockChangeRequests[requestIndex].status = "Aprovado";
      mockChangeRequests[requestIndex].reviewedBy = currentUser.name;
      mockChangeRequests[requestIndex].reviewDate = new Date().toISOString();
      toastMessage = `Solicitação ${requestId} aprovada rapidamente.`;

      if (request.controlId.startsWith("NEW-CTRL-")) {
        const newControlIdNumber = mockSoxControls.length + 1;
        const newSoxControl: SoxControl = {
          id: String(newControlIdNumber),
          controlId: request.changes.controlId || `CTRL-QUICK-${newControlIdNumber}`,
          controlName: request.changes.controlName || "Novo Controle (Aprovação Rápida)",
          description: request.changes.description || "Detalhes na solicitação.",
          controlOwner: request.changes.controlOwner || request.requestedBy,
          controlFrequency: request.changes.controlFrequency || "Ad-hoc",
          controlType: request.changes.controlType || "Preventivo",
          status: "Ativo", // Novo controle aprovado fica ativo
          lastUpdated: new Date().toISOString(),
          relatedRisks: request.changes.relatedRisks || [], 
          testProcedures: request.changes.testProcedures || "", 
          evidenceRequirements: request.changes.evidenceRequirements || "",
          processo: request.changes.processo,
          subProcesso: request.changes.subProcesso,
          modalidade: request.changes.modalidade
        };
        mockSoxControls.push(newSoxControl);
        mockVersionHistory.unshift({
          id: `vh-quick-new-${newSoxControl.id}-${Date.now()}`, controlId: newSoxControl.id,
          changeDate: new Date().toISOString(), changedBy: currentUser.name,
          summaryOfChanges: `Controle ${newSoxControl.controlId} criado via aprovação rápida da solicitação ${request.id}.`,
          newValues: { ...newSoxControl }, // Guarda todos os valores do novo controle
          relatedChangeRequestId: request.id
        });
      } else {
        const controlIndex = mockSoxControls.findIndex(c => c.controlId === request.controlId);
        if (controlIndex !== -1) {
          const originalControl = { ...mockSoxControls[controlIndex] };
          mockSoxControls[controlIndex] = { ...originalControl, ...request.changes, lastUpdated: new Date().toISOString(), status: "Ativo" }; // Garante que o controle alterado está Ativo
           mockVersionHistory.unshift({
            id: `vh-quick-update-${mockSoxControls[controlIndex].id}-${Date.now()}`, controlId: mockSoxControls[controlIndex].id,
            changeDate: new Date().toISOString(), changedBy: currentUser.name,
            summaryOfChanges: `Alterações rápidas da solicitação ${request.id} aplicadas ao controle ${mockSoxControls[controlIndex].controlId}.`,
            previousValues: originalControl,
            newValues: request.changes,
            relatedChangeRequestId: request.id
          });
        }
      }

    } else { // reject
      mockChangeRequests[requestIndex].status = "Rejeitado";
      mockChangeRequests[requestIndex].reviewedBy = currentUser.name;
      mockChangeRequests[requestIndex].reviewDate = new Date().toISOString();
      mockChangeRequests[requestIndex].adminFeedback = "Rejeitado via ação rápida da tabela. Ver detalhes da solicitação para mais informações se necessário.";
      toastMessage = `Solicitação ${requestId} rejeitada rapidamente.`;
    }
    
    toast({ title: "Sucesso!", description: toastMessage });
    forceRerender(); 
  };

  // Filtros para Administrador
  const adminPendingAlterations = useMemo(() => mockChangeRequests.filter(req => 
    !req.controlId.startsWith("NEW-CTRL-") && req.status === "Pendente"
  ), [mockChangeRequests, dataVersion]);

  const adminPendingNewControls = useMemo(() => mockChangeRequests.filter(req => 
    req.controlId.startsWith("NEW-CTRL-") && req.status === "Pendente"
  ), [mockChangeRequests, dataVersion]);


  // Filtros para Dono do Controle
  const ownerPendingApprovalRequests = useMemo(() => mockChangeRequests.filter(
    req => req.requestedBy === currentUser.name && (req.status === "Pendente" || req.status === "Em Análise")
  ), [mockChangeRequests, currentUser.name, dataVersion]);

  const ownerAwaitingFeedbackRequests = useMemo(() => mockChangeRequests.filter(
    req => req.requestedBy === currentUser.name && req.status === "Aguardando Feedback do Dono"
  ), [mockChangeRequests, currentUser.name, dataVersion]);

  const ownerRequestsHistory = useMemo(() => mockChangeRequests.filter(
    req => req.requestedBy === currentUser.name && (req.status === "Aprovado" || req.status === "Rejeitado")
  ), [mockChangeRequests, currentUser.name, dataVersion]);

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
                    {isAdminContext && request.status === "Pendente" && (
                      <>
                        <Button variant="ghost" size="icon" className="text-green-600 hover:text-green-700" title="Aprovar Rapidamente" onClick={() => handleQuickAdminAction(request.id, "approve")}>
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700" title="Rejeitar Rapidamente" onClick={() => handleQuickAdminAction(request.id, "reject")}>
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </>
                    )}
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
    
