// src/app/pending-approvals/page.tsx
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ChangeRequest } from "@/types";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { HistoryIcon, AlertTriangle, FileText, PlusSquare, CheckCircle2, Loader2, Edit2, XCircle, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useUserProfile } from "@/contexts/user-profile-context";
import { useState, useMemo, useEffect, useCallback } from "react";
import { getChangeRequests, updateChangeRequestStatus } from "@/services/sox-service";

export default function PendingApprovalsPage() {
  const { currentUser, isUserAdmin, isUserControlOwner } = useUserProfile();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  
  const [requestToAction, setRequestToAction] = useState<{request: ChangeRequest, action: 'Aprovado' | 'Rejeitado'} | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const requestsData = await getChangeRequests();
      setChangeRequests(requestsData);
    } catch (error) {
      console.error("Failed to load change requests:", error);
      toast({ title: "Erro", description: "Não foi possível carregar as solicitações.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [currentUser.id, loadData]);

  // Filtros para Administrador
  const adminPendingAlterations = useMemo(() => changeRequests.filter(req => 
    req.requestType === "Alteração" && req.status === "Pendente"
  ), [changeRequests]);

  const adminPendingNewControls = useMemo(() => changeRequests.filter(req => 
    req.requestType === "Criação" && req.status === "Pendente"
  ), [changeRequests]);

  const adminRequestsHistory = useMemo(() => changeRequests.filter(req => 
    req.status === "Aprovado" || req.status === "Rejeitado"
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

  const handleConfirmAction = async () => {
    if (!requestToAction) return;
    setIsSubmitting(true);
    try {
        await updateChangeRequestStatus(requestToAction.request.id, requestToAction.action, currentUser.name);
        toast({
            title: "Sucesso",
            description: `A solicitação ${requestToAction.request.id} foi marcada como "${requestToAction.action}".`,
        });
        loadData(); // Reload data to reflect changes
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Não foi possível processar a solicitação.";
        toast({ title: "Erro", description: errorMessage, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
        setRequestToAction(null);
    }
  };

  const pageTitle = isUserAdmin() ? "Aprovações Pendentes" : "Minhas Solicitações";
  const pageDescription = isUserAdmin()
    ? "Revise e aprove ou rejeite as solicitações de alteração e criação de controles."
    : "Acompanhe o status das suas propostas e alterações de controles internos.";

  const renderRequestTable = (requests: ChangeRequest[], context: "admin-alterations" | "admin-new" | "admin-history" | "owner-pending" | "owner-feedback" | "owner-history") => {
    if (requests.length === 0) {
      let message = "Nenhuma solicitação encontrada para esta categoria.";
      if (context === "admin-alterations" && isUserAdmin()) message = "Nenhuma solicitação de alteração pendente de aprovação.";
      else if (context === "admin-new" && isUserAdmin()) message = "Nenhuma solicitação de criação de novo controle pendente.";
      else if (context === "admin-history") message = "Nenhuma solicitação no histórico.";
      else if (context === "owner-pending") message = "Você não possui solicitações pendentes de aprovação.";
      else if (context === "owner-feedback") message = "Nenhuma solicitação aguardando sua ação.";
      else if (context === "owner-history") message = "Nenhuma solicitação no seu histórico.";
      return <p className="mt-4 text-center text-muted-foreground">{message}</p>;
    }

    const isAdminActionView = context === "admin-alterations" || context === "admin-new";
    const isAdminView = context.startsWith("admin");
    const isHistoryView = context.endsWith("history");

    return (
      <div className="rounded-md border mt-4 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID Solicitação</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Controle</TableHead>
              {isAdminView && <TableHead>Solicitado Por</TableHead>}
              <TableHead>Data da Solicitação</TableHead>
              
              {(context === "owner-pending" || isAdminActionView) && <TableHead>Detalhes da Mudança</TableHead>}
              
              {context === "owner-pending" && <TableHead>Status Atual</TableHead>}
              {context === "owner-feedback" && <TableHead>Feedback do Admin</TableHead>}

              {isHistoryView && <TableHead>Status Final</TableHead>}
              {isHistoryView && <TableHead>Revisado Por</TableHead>}
              {isHistoryView && <TableHead>Data Revisão</TableHead>}
              
              <TableHead className="text-right min-w-[120px]">Ações</TableHead>
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
                
                {isAdminView && <TableCell>{request.requestedBy}</TableCell>}
                <TableCell>{new Date(request.requestDate).toLocaleDateString('pt-BR')}</TableCell>
                
                {(context === "owner-pending" || isAdminActionView) && (
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

                {isHistoryView && (
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
                  {isAdminActionView && request.status === "Pendente" && (
                      <div className="flex gap-2 justify-end">
                          <Button variant="ghost" size="icon" className="text-green-600 hover:text-green-700" onClick={() => setRequestToAction({request, action: 'Aprovado'})} title="Aprovar">
                              <CheckCircle className="h-5 w-5" />
                              <span className="sr-only">Aprovar</span>
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700" onClick={() => setRequestToAction({request, action: 'Rejeitado'})} title="Rejeitar">
                              <XCircle className="h-5 w-5" />
                              <span className="sr-only">Rejeitar</span>
                          </Button>
                      </div>
                  )}
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
              <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3">
                <TabsTrigger value="alterations">
                  <FileText className="mr-2 h-4 w-4 text-blue-600" /> Alterações Pendentes ({adminPendingAlterations.length})
                </TabsTrigger>
                <TabsTrigger value="new_controls">
                  <PlusSquare className="mr-2 h-4 w-4 text-green-600" /> Criações Pendentes ({adminPendingNewControls.length})
                </TabsTrigger>
                 <TabsTrigger value="history">
                  <HistoryIcon className="mr-2 h-4 w-4 text-gray-600" /> Histórico de Solicitações ({adminRequestsHistory.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="alterations">
                {renderRequestTable(adminPendingAlterations, "admin-alterations")}
              </TabsContent>
              <TabsContent value="new_controls">
                {renderRequestTable(adminPendingNewControls, "admin-new")}
              </TabsContent>
              <TabsContent value="history">
                {renderRequestTable(adminRequestsHistory, "admin-history")}
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

       <AlertDialog open={!!requestToAction} onOpenChange={(open) => !open && setRequestToAction(null)}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar Ação</AlertDialogTitle>
                  <AlertDialogDescription>
                      Você tem certeza que deseja <strong>{requestToAction?.action === 'Aprovado' ? 'aprovar' : 'rejeitar'}</strong> a solicitação para o controle <strong>{requestToAction?.request.controlName}</strong>?
                      <br />
                      {requestToAction?.action === 'Aprovado' && 'As alterações serão aplicadas permanentemente.'}
                      {requestToAction?.action === 'Rejeitado' && 'A solicitação será encerrada e o solicitante notificado.'}
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setRequestToAction(null)} disabled={isSubmitting}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleConfirmAction} disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Confirmar
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
