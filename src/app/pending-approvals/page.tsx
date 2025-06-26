
// src/app/pending-approvals/page.tsx
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ChangeRequest } from "@/types";
import { Button } from "@/components/ui/button";
import { HistoryIcon, AlertTriangle, FileText, PlusSquare, CheckCircle2, Loader2, Edit2 } from "lucide-react";
import Link from "next/link";
import { useUserProfile } from "@/contexts/user-profile-context";
import { useState, useMemo, useEffect } from "react";
import { getChangeRequests } from "@/services/sox-service";

export default function PendingApprovalsPage() {
  const { currentUser, isUserAdmin, isUserControlOwner } = useUserProfile();
  const [isLoading, setIsLoading] = useState(true);
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const requestsData = await getChangeRequests();
        setChangeRequests(requestsData);
      } catch (error) {
        console.error("Failed to load change requests:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Filtros para Administrador
  const adminPendingAlterations = useMemo(() => changeRequests.filter(req => 
    req.requestType === "Alteração" && req.status === "Pendente"
  ), [changeRequests]);

  const adminPendingNewControls = useMemo(() => changeRequests.filter(req => 
    req.requestType === "Criação" && req.status === "Pendente"
  ), [changeRequests]);


  // Filtros para Dono do Controle
  const ownerPendingApprovalRequests = useMemo(() => {
    if (!currentUser) return [];
    return changeRequests.filter(
      req => req.requestedBy === currentUser.name && (req.status === "Pendente" || req.status === "Em Análise")
    );
  }, [changeRequests, currentUser]);

  const ownerAwaitingFeedbackRequests = useMemo(() => {
    if (!currentUser) return [];
    return changeRequests.filter(
      req => req.requestedBy === currentUser.name && req.status === "Aguardando Feedback do Dono"
    );
  }, [changeRequests, currentUser]);

  const ownerRequestsHistory = useMemo(() => {
    if (!currentUser) return [];
    return changeRequests.filter(
      req => req.requestedBy === currentUser.name && (req.status === "Aprovado" || req.status === "Rejeitado")
    );
  }, [changeRequests, currentUser]);

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
      <div className="rounded-md border mt-4 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID Solicitação</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Controle</TableHead>
              {isAdminContext && <TableHead>Solicitado Por</TableHead>}
              <TableHead>Data da Solicitação</TableHead>
              
              {(context === "owner-pending" || isAdminContext) && <TableHead>Detalhes da Mudança</TableHead>}
              
              {context === "owner-pending" && <TableHead>Status Atual</TableHead>}
              {context === "owner-feedback" && <TableHead>Feedback do Admin</TableHead>}
              {context === "owner-history" && <TableHead>Status Final</TableHead>}
              {context === "owner-history" && <TableHead>Revisado Por</TableHead>}
              {context === "owner-history" && <TableHead>Data Decisão</TableHead>}
              
              <TableHead className="text-right min-w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell className="font-medium">{request.id}</TableCell>
                <TableCell>{request.requestType}</TableCell>
                <TableCell>
                  {request.controlName ? `${request.controlName} (${request.controlId})` : request.controlId}
                </TableCell>
                
                {isAdminContext && <TableCell>{request.requestedBy}</TableCell>}
                <TableCell>{new Date(request.requestDate).toLocaleDateString('pt-BR')}</TableCell>
                
                {(context === "owner-pending" || isAdminContext) && (
                  <TableCell className="max-w-md whitespace-pre-wrap text-sm text-muted-foreground">
                    {request.requestType === "Criação" ? `Proposta para novo controle: ${request.changes.controlName || 'Sem nome'}` : 
                     (request.comments || 'Nenhum detalhe fornecido.')}
                  </TableCell>
                )}

                {context === "owner-pending" && (
                  <TableCell>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
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
                        <span className="text-xs text-muted-foreground">Revise sua proposta e reenvie.</span>
                    </div>
                  </TableCell>
                )}

                {context === "owner-history" && (
                  <>
                    <TableCell>
                       <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
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
                  {/* Ações como Editar/Visualizar podem ser adicionadas aqui */}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  if (isLoading) {
      return (
          <div className="flex items-center justify-center h-screen">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="ml-2">Carregando solicitações...</p>
          </div>
      );
  }

  return (
    <div className="space-y-6 w-full">
      <Card className="w-full">
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
