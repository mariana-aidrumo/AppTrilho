// src/app/pending-approvals/page.tsx
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ChangeRequest } from "@/types";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { HistoryIcon, AlertTriangle, FileText, CheckCircle2, Loader2, XCircle, CheckCircle, PlusSquare } from "lucide-react";
import Link from "next/link";
import { useUserProfile } from "@/contexts/user-profile-context";
import { useState, useMemo, useEffect, useCallback } from "react";
import { getChangeRequests, updateChangeRequestStatus } from "@/services/sox-service";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function PendingApprovalsPage() {
  const { currentUser, isUserAdmin, isUserControlOwner } = useUserProfile();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  
  const [requestToAction, setRequestToAction] = useState<{request: ChangeRequest, action: 'Aprovado' | 'Rejeitado' | 'Ciente'} | null>(null);
  const [adminFeedback, setAdminFeedback] = useState("");
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
  const adminPendingAlteracaoRequests = useMemo(() => changeRequests.filter(req => req.status === "Pendente" && req.requestType === "Alteração"), [changeRequests]);
  const adminPendingCriacaoRequests = useMemo(() => changeRequests.filter(req => req.status === "Pendente" && req.requestType === "Criação"), [changeRequests]);
  const adminHistoryRequests = useMemo(() => changeRequests.filter(req => req.status !== "Pendente"), [changeRequests]);


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
      req => req.requestedBy === currentUser.name && (req.status === "Aprovado" || req.status === "Rejeitado" || req.status === "Ciente")
    );
  }, [changeRequests, currentUser]);

  const handleConfirmAction = async () => {
    if (!requestToAction) return;
    setIsSubmitting(true);

    try {
        await updateChangeRequestStatus(requestToAction.request.id, requestToAction.action, currentUser.name, adminFeedback);
        toast({
            title: "Sucesso",
            description: `A solicitação foi processada com sucesso.`,
        });
        loadData(); // Reload data to reflect changes
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Não foi possível processar a solicitação.";
        toast({ title: "Erro", description: errorMessage, variant: "destructive", duration: 10000 });
    } finally {
        setIsSubmitting(false);
        setRequestToAction(null);
        setAdminFeedback("");
    }
  };

  const handleOpenDialog = (request: ChangeRequest, action: 'Aprovado' | 'Rejeitado' | 'Ciente') => {
    setRequestToAction({ request, action });
    setAdminFeedback(""); // Reset feedback on open
  };

  const pageTitle = isUserAdmin() ? "Aprovações Pendentes" : "Minhas Solicitações";
  const pageDescription = isUserAdmin()
    ? "Revise e aprove ou rejeite as solicitações de alteração e criação de controles."
    : "Acompanhe o status das suas propostas e alterações de controles internos.";

  const renderRequestTable = (requests: ChangeRequest[], context: "admin-alteracao" | "admin-criacao" | "admin-history" | "owner-pending" | "owner-feedback" | "owner-history") => {
    if (requests.length === 0) {
      let message = "Nenhuma solicitação encontrada para esta categoria.";
      if (context === "admin-alteracao" && isUserAdmin()) message = "Nenhuma solicitação de alteração pendente de aprovação.";
      else if (context === "admin-criacao" && isUserAdmin()) message = "Nenhuma solicitação de criação pendente de aprovação.";
      else if (context === "admin-history") message = "Nenhuma solicitação no histórico.";
      else if (context === "owner-pending") message = "Você não possui solicitações pendentes de aprovação.";
      else if (context === "owner-feedback") message = "Nenhuma solicitação aguardando sua ação.";
      else if (context === "owner-history") message = "Nenhuma solicitação no seu histórico.";
      return <p className="mt-4 text-center text-muted-foreground">{message}</p>;
    }

    const isAdminActionView = context.startsWith("admin-");
    const isAdminView = context.startsWith("admin");

    return (
      <div className="rounded-md border mt-4 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID Solicitação</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Controle (ID/Nome)</TableHead>
              {isAdminView && <TableHead>Solicitado Por</TableHead>}
              <TableHead>Data da Solicitação</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Detalhes da Mudança</TableHead>
              {context === "admin-history" && <TableHead>Revisado Por</TableHead>}
              {context === "admin-history" && <TableHead>Data Revisão</TableHead>}
              {context === "admin-history" && <TableHead>Feedback do Admin</TableHead>}
              <TableHead className="text-right min-w-[120px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell className="font-medium">{request.id}</TableCell>
                <TableCell>{request.requestType}</TableCell>
                <TableCell>
                  {request.controlName ? `${request.controlId} (${request.controlName})` : request.controlId}
                </TableCell>
                
                {isAdminView && <TableCell>{request.requestedBy}</TableCell>}
                <TableCell>{request.requestDate ? new Date(request.requestDate).toLocaleDateString('pt-BR') : 'N/A'}</TableCell>
                <TableCell>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                        request.status === "Pendente" ? "bg-yellow-100 text-yellow-700" :
                        request.status === "Aprovado" ? "bg-green-100 text-green-700" :
                        request.status === "Ciente" ? "bg-sky-100 text-sky-700" :
                        request.status === "Rejeitado" ? "bg-red-100 text-red-700" :
                        request.status === "Em Análise" ? "bg-blue-100 text-blue-700" :
                        request.status === "Aguardando Feedback do Dono" ? "bg-orange-100 text-orange-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {request.status}
                      </span>
                </TableCell>
                 <TableCell className="max-w-md whitespace-pre-wrap text-sm text-muted-foreground">
                    {request.comments || 'Nenhum detalhe fornecido.'}
                  </TableCell>
                {context === "admin-history" && <TableCell>{request.reviewedBy || "N/A"}</TableCell>}
                {context === "admin-history" && <TableCell>{request.reviewDate ? new Date(request.reviewDate).toLocaleDateString('pt-BR') : "N/A"}</TableCell>}
                {context === "admin-history" && <TableCell className="whitespace-pre-wrap">{request.adminFeedback || "N/A"}</TableCell>}
                
                <TableCell className="text-right">
                  {context === "admin-alteracao" && (
                      <div className="flex gap-2 justify-end">
                          <Button variant="ghost" size="icon" className="text-green-600 hover:text-green-700" onClick={() => handleOpenDialog(request, 'Aprovado')} title="Aprovar">
                              <CheckCircle className="h-5 w-5" />
                              <span className="sr-only">Aprovar</span>
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700" onClick={() => handleOpenDialog(request, 'Rejeitado')} title="Rejeitar">
                              <XCircle className="h-5 w-5" />
                              <span className="sr-only">Rejeitar</span>
                          </Button>
                      </div>
                  )}
                   {context === "admin-criacao" && (
                      <div className="flex gap-2 justify-end">
                          <Button variant="ghost" size="icon" className="text-sky-600 hover:text-sky-700" onClick={() => handleOpenDialog(request, 'Ciente')} title="Ciente (Criar Controle)">
                              <CheckCircle2 className="h-5 w-5" />
                              <span className="sr-only">Ciente</span>
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700" onClick={() => handleOpenDialog(request, 'Rejeitado')} title="Rejeitar">
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
  
  const getActionText = () => {
    if (!requestToAction) return { verb: '', consequence: '' };
    switch (requestToAction.action) {
        case 'Aprovado':
            return { verb: 'aprovar', consequence: 'As alterações serão aplicadas permanentemente.' };
        case 'Ciente':
            return { verb: 'marcar como ciente e criar', consequence: 'Um novo controle será criado na matriz com o nome proposto.' };
        case 'Rejeitado':
            return { verb: 'rejeitar', consequence: 'A solicitação será encerrada e o solicitante notificado.' };
        default:
            return { verb: '', consequence: '' };
    }
  };

  return (
    <div className="space-y-6 w-full">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{pageTitle}</CardTitle>
          <CardDescription>{pageDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          {isUserAdmin() && (
            <Tabs defaultValue="alteracoes">
              <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3">
                <TabsTrigger value="alteracoes">
                  <FileText className="mr-2 h-4 w-4 text-blue-600" /> Solicitações de Alteração ({adminPendingAlteracaoRequests.length})
                </TabsTrigger>
                 <TabsTrigger value="criacoes">
                  <PlusSquare className="mr-2 h-4 w-4 text-purple-600" /> Solicitações de Criação ({adminPendingCriacaoRequests.length})
                </TabsTrigger>
                <TabsTrigger value="history">
                  <HistoryIcon className="mr-2 h-4 w-4 text-gray-600" /> Histórico de Solicitações ({adminHistoryRequests.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="alteracoes">
                {renderRequestTable(adminPendingAlteracaoRequests, "admin-alteracao")}
              </TabsContent>
              <TabsContent value="criacoes">
                 {renderRequestTable(adminPendingCriacaoRequests, "admin-criacao")}
              </TabsContent>
              <TabsContent value="history">
                {renderRequestTable(adminHistoryRequests, "admin-history")}
              </TabsContent>
            </Tabs>
          )}
          
          {isUserControlOwner() && !isUserAdmin() && (
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

       <AlertDialog open={!!requestToAction} onOpenChange={(open) => { if (!open) { setRequestToAction(null); setAdminFeedback(""); }}}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar Ação</AlertDialogTitle>
                  <AlertDialogDescription>
                    <div>
                        Você tem certeza que deseja <strong>{getActionText().verb}</strong> a solicitação para o controle <strong>{requestToAction?.request.controlName}</strong>?
                        <br />
                        {getActionText().consequence}
                    </div>
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="grid gap-2">
                 <Label htmlFor="admin-feedback">Feedback (Opcional)</Label>
                 <Textarea 
                    id="admin-feedback"
                    placeholder="Deixe um comentário para o solicitante..."
                    value={adminFeedback}
                    onChange={(e) => setAdminFeedback(e.target.value)}
                 />
              </div>
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
