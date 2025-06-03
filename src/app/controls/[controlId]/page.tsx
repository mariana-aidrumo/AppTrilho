
// src/app/controls/[controlId]/page.tsx
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { SoxControl, UnifiedHistoryItem, UnifiedHistoryEventType, ChangeRequest } from "@/types";
import { ArrowLeft, Edit2, History, PlusCircle, ShieldAlert, ListOrdered } from "lucide-react";
import Link from "next/link";
import { useUserProfile } from "@/contexts/user-profile-context";
import { useSearchParams } from 'next/navigation';
import { mockSoxControls, mockVersionHistory as allMockVersionHistory, mockChangeRequests } from "@/data/mock-data";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMemo } from "react";

interface ControlDetailPageProps {
  params: {
    controlId: string;
  };
}

export default function ControlDetailPage({ params }: ControlDetailPageProps) {
  const { currentUser, isUserAdmin, isUserControlOwner } = useUserProfile();
  const searchParams = useSearchParams();
  const isEditMode = searchParams.get('edit') === 'true';

  const control = mockSoxControls.find(c => c.id === params.controlId);

  const mockPendingChangeForThisControl = control
    ? mockChangeRequests.find(req => req.controlId === control.controlId && (req.status === "Pendente" || req.status === "Em Análise"))
    : undefined;

  const unifiedHistory = useMemo(() => {
    if (!control) return [];

    const historyItems: UnifiedHistoryItem[] = [];

    allMockVersionHistory
      .filter(vh => vh.controlId === control.id)
      .forEach(vh => {
        let eventType: UnifiedHistoryEventType = vh.summaryOfChanges.toLowerCase().includes("criado") ? "CONTROL_CREATED" : "CONTROL_UPDATED";
        let description = vh.summaryOfChanges;
        if (vh.relatedChangeRequestId) {
          const relatedCR = mockChangeRequests.find(cr => cr.id === vh.relatedChangeRequestId);
          if (relatedCR) {
            if (relatedCR.status === "Aprovado") {
                 description = `Solicitação de mudança ${vh.relatedChangeRequestId} aprovada, ${vh.summaryOfChanges.toLowerCase().replace(`controle ${control.controlId}`, '').trim()}`;
                 eventType = "CHANGE_REQUEST_APPROVED";
            }
          }
        }
        historyItems.push({
          id: vh.id,
          date: vh.changeDate,
          type: eventType,
          description: description,
          actor: vh.changedBy,
          sourceId: vh.relatedChangeRequestId,
        });
      });

    mockChangeRequests
      .filter(cr => cr.controlId === control.controlId || (cr.changes.controlId === control.controlId && cr.controlId.startsWith("NEW-CTRL")))
      .forEach(cr => {
        const alreadyCoveredByVH = historyItems.some(hi => hi.type === "CHANGE_REQUEST_APPROVED" && hi.sourceId === cr.id);

        if (!alreadyCoveredByVH) {
            let eventType: UnifiedHistoryEventType | null = null;
            let description = "";
            let eventDate = cr.requestDate;
            let actor = cr.requestedBy;

            switch (cr.status) {
                case "Pendente":
                case "Em Análise":
                    eventType = "CHANGE_REQUEST_SUBMITTED";
                    description = `Solicitação de mudança ${cr.id} enviada por ${cr.requestedBy}.`;
                    break;
                case "Rejeitado":
                    eventType = "CHANGE_REQUEST_REJECTED";
                    description = `Solicitação de mudança ${cr.id} rejeitada por ${cr.reviewedBy || 'Admin'}. Motivo: ${cr.adminFeedback || 'Não especificado'}`;
                    eventDate = cr.reviewDate || cr.requestDate;
                    actor = cr.reviewedBy || 'Admin';
                    break;
                case "Aguardando Feedback do Dono":
                    eventType = "CHANGE_REQUEST_FEEDBACK_REQUESTED";
                    description = `Feedback solicitado pelo admin para ${cr.id}: "${cr.adminFeedback || 'Revisar proposta.'}"`;
                    eventDate = cr.reviewDate || cr.requestDate;
                    actor = cr.reviewedBy || 'Admin';
                    break;
            }

            if (eventType) {
                historyItems.push({
                    id: cr.id,
                    date: eventDate,
                    type: eventType,
                    description: description,
                    actor: actor,
                    sourceId: cr.id,
                });
            }
        }
      });

    return historyItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [control, allMockVersionHistory, mockChangeRequests]);

  const renderPendingChangesList = () => {
    if (!mockPendingChangeForThisControl || !mockPendingChangeForThisControl.changes || Object.keys(mockPendingChangeForThisControl.changes).length === 0) {
      return <p className="text-sm text-muted-foreground">Nenhuma mudança específica proposta.</p>;
    }
    const items: JSX.Element[] = [];
    const changes = mockPendingChangeForThisControl.changes;

    for (const key in changes) {
      if (Object.prototype.hasOwnProperty.call(changes, key)) {
        const value = (changes as any)[key];
        const fieldTranslations: Record<string, string> = {
            controlId: "ID do Controle", controlName: "Nome do Controle", description: "Descrição",
            controlOwner: "Dono do Controle", controlFrequency: "Frequência", controlType: "Tipo",
            status: "Status", lastUpdated: "Última Atualização", relatedRisks: "Riscos Relacionados",
            testProcedures: "Procedimentos de Teste",
            processo: "Processo", subProcesso: "Subprocesso", modalidade: "Modalidade",
            justificativa: "Justificativa", responsavel: "Responsável", n3Responsavel: "N3 Responsável"
        };
        const formattedKey = fieldTranslations[key] || key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
        items.push(
          <li key={key}><strong>{formattedKey}:</strong> {String(value)}</li>
        );
      }
    }

    if (items.length === 0) return <p className="text-sm text-muted-foreground">Nenhuma mudança específica proposta.</p>;
    return <ul className="list-disc list-inside ml-4 mt-1 space-y-1">{items}</ul>;
  };


  if (!control) {
    return (
        <div className="space-y-6 w-full">
            <div className="flex items-center">
            <Button variant="outline" asChild>
                <Link href="/sox-matrix">
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Painel
                </Link>
            </Button>
            </div>
            <Card className="w-full">
            <CardHeader>
                <CardTitle>Erro</CardTitle>
            </CardHeader>
            <CardContent>
                <p>Controle não encontrado.</p>
            </CardContent>
            </Card>
      </div>
    );
  }

  const canEditControl = isUserAdmin() || (isUserControlOwner() && currentUser.controlsOwned?.includes(control.id));
  const effectiveEditMode = isEditMode && canEditControl;

  const getEventTypeLabel = (type: UnifiedHistoryEventType) => {
    switch (type) {
      case "CONTROL_CREATED": return "Criação";
      case "CONTROL_UPDATED": return "Atualização";
      case "CHANGE_REQUEST_SUBMITTED": return "Solicitação Enviada";
      case "CHANGE_REQUEST_APPROVED": return "Solicitação Aprovada";
      case "CHANGE_REQUEST_REJECTED": return "Solicitação Rejeitada";
      case "CHANGE_REQUEST_FEEDBACK_REQUESTED": return "Feedback Solicitado";
      default: return "Evento";
    }
  };


  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <Button variant="outline" asChild>
          <Link href={isUserControlOwner() && currentUser.controlsOwned?.includes(control.id) ? "/my-registered-controls" : "/sox-matrix"}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para {isUserControlOwner() && currentUser.controlsOwned?.includes(control.id) ? "Meus Controles" : "Painel da Matriz SOX"}
          </Link>
        </Button>
        {canEditControl && (!mockPendingChangeForThisControl || mockPendingChangeForThisControl.controlId !== control.controlId) && (
          <Button asChild={!effectiveEditMode} onClick={effectiveEditMode ? undefined : () => { /* Lógica para solicitar alteração se não estiver em edit mode */}}>
            {effectiveEditMode ? (
                 <Link href={`/controls/${control.id}`}>
                    <Edit2 className="mr-2 h-4 w-4" /> Salvar Alterações (Simulado)
                 </Link>
            ) : (
                 <Link href={`/controls/${control.id}?edit=true`}>
                    <Edit2 className="mr-2 h-4 w-4" /> {isUserAdmin() ? "Editar Controle" : "Solicitar Alteração"}
                 </Link>
            )}
          </Button>
        )}
      </div>

      {mockPendingChangeForThisControl && mockPendingChangeForThisControl.controlId === control.controlId &&
       (isUserAdmin() || (isUserControlOwner() && currentUser.controlsOwned?.includes(control.id))) && ( // Adicionada a condição de verificação de propriedade/admin
        <Card className="border-yellow-400 bg-yellow-50/70 shadow-md w-full">
            <CardHeader>
                <CardTitle className="text-lg text-yellow-800 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5" />
                    Solicitação de Alteração Pendente para Este Controle
                </CardTitle>
                <CardDescription className="text-yellow-700">
                    Existe uma solicitação de alteração para este controle que aguarda aprovação.
                    {isUserAdmin() ? " Você pode revisá-la abaixo ou ir para a página de aprovações." : " Aguardando revisão do administrador."}
                </CardDescription>
            </CardHeader>
            <CardContent className="text-sm">
                <p><strong>ID da Solicitação:</strong> {mockPendingChangeForThisControl.id}</p>
                <p><strong>Solicitado por:</strong> {mockPendingChangeForThisControl.requestedBy} em {new Date(mockPendingChangeForThisControl.requestDate).toLocaleDateString('pt-BR')}</p>
                <p className="mt-1"><strong>Resumo das alterações propostas:</strong></p>
                {renderPendingChangesList()}
                 <div className="mt-4 flex justify-end">
                    <Button variant="outline" size="sm" asChild className="border-yellow-600 text-yellow-700 hover:bg-yellow-100">
                        <Link href={`/change-requests/${mockPendingChangeForThisControl.id}`}>
                            Ver Detalhes da Solicitação
                        </Link>
                    </Button>
                 </div>
            </CardContent>
        </Card>
      )}

      <Card className="shadow-lg w-full">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{control.controlId}: {control.controlName}</CardTitle>
              <CardDescription>Última Atualização: {new Date(control.lastUpdated).toLocaleDateString('pt-BR')}</CardDescription>
            </div>
            <span className={`px-3 py-1.5 text-sm font-semibold rounded-full ${
              control.status === "Ativo" ? "bg-green-100 text-green-700" :
              control.status === "Pendente Aprovação" ? "bg-yellow-100 text-yellow-700" :
              control.status === "Inativo" ? "bg-red-100 text-red-700" :
              "bg-gray-100 text-gray-700"
            }`}>
              {control.status}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {effectiveEditMode && (
            <div className="p-4 border-2 border-dashed border-primary rounded-md bg-primary/5 mb-6">
              <p className="text-sm font-semibold text-primary text-center">
                Modo de Edição Ativado (Simulado). Aqui você poderia ter campos de formulário para editar os detalhes do controle.
              </p>
            </div>
          )}
          <div>
            <h3 className="font-semibold text-muted-foreground">Descrição</h3>
            <p className="text-sm">{control.description}</p>
          </div>
          <Separator />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h3 className="font-semibold text-muted-foreground">Dono</h3>
              <p className="text-sm">{control.controlOwner}</p>
            </div>
            <div>
              <h3 className="font-semibold text-muted-foreground">Frequência</h3>
              <p className="text-sm">{control.controlFrequency}</p>
            </div>
            <div>
              <h3 className="font-semibold text-muted-foreground">Tipo (P/D)</h3>
              <p className="text-sm">{control.controlType}</p>
            </div>
          </div>
           <Separator />
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
                <h3 className="font-semibold text-muted-foreground">Processo</h3>
                <p className="text-sm">{control.processo || "N/A"}</p>
            </div>
            <div>
                <h3 className="font-semibold text-muted-foreground">Subprocesso</h3>
                <p className="text-sm">{control.subProcesso || "N/A"}</p>
            </div>
             <div>
                <h3 className="font-semibold text-muted-foreground">Modalidade</h3>
                <p className="text-sm">{control.modalidade || "N/A"}</p>
            </div>
           </div>
           <Separator />
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <h3 className="font-semibold text-muted-foreground">Responsável</h3>
                <p className="text-sm">{control.responsavel || "N/A"}</p>
            </div>
            <div>
                <h3 className="font-semibold text-muted-foreground">N3 Responsável</h3>
                <p className="text-sm">{control.n3Responsavel || "N/A"}</p>
            </div>
           </div>
          <Separator />
           <div>
            <h3 className="font-semibold text-muted-foreground">Riscos Relacionados</h3>
            {control.relatedRisks && control.relatedRisks.length > 0 ? (
              <ul className="list-disc list-inside text-sm">
                {control.relatedRisks.map(risk => <li key={risk}>{risk}</li>)}
              </ul>
            ) : <p className="text-sm text-muted-foreground">Nenhum risco relacionado especificado.</p>}
          </div>
          <Separator />
          <div>
            <h3 className="font-semibold text-muted-foreground">Procedimentos de Teste</h3>
            <p className="text-sm whitespace-pre-wrap">{control.testProcedures}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-2">
             <History className="w-5 h-5" />
             <CardTitle>Histórico do Controle</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {unifiedHistory.length > 0 ? (
            <>
              <ul className="space-y-3">
                {unifiedHistory.slice(0, 3).map(entry => (
                  <li key={`${entry.id}-${entry.type}`} className="text-sm border-l-2 pl-3 border-primary/50">
                    <p className="flex justify-between items-center">
                      <span className="font-semibold">{getEventTypeLabel(entry.type)}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(entry.date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} por {entry.actor}
                      </span>
                    </p>
                    <p className="text-muted-foreground">{entry.description}</p>
                    {entry.sourceId && entry.type !== "CONTROL_CREATED" && entry.type !== "CONTROL_UPDATED" && (
                       <Link href={`/change-requests/${entry.sourceId}`} className="text-xs text-primary hover:underline">
                         Ver Solicitação {entry.sourceId}
                       </Link>
                    )}
                  </li>
                ))}
              </ul>
              {unifiedHistory.length > 3 && (
                <div className="mt-4 flex justify-end">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/controls/${control.id}/history`}>
                      <ListOrdered className="mr-2 h-4 w-4" />
                      Ver Histórico Completo do Controle
                    </Link>
                  </Button>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum histórico disponível para este controle.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

