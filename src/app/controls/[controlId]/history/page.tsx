// src/app/controls/[controlId]/history/page.tsx
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ListOrdered } from "lucide-react";
import Link from "next/link";
import { mockSoxControls, mockVersionHistory as allMockVersionHistory, mockChangeRequests } from "@/data/mock-data"; // mockEvidenceFiles removido
import type { SoxControl, UnifiedHistoryItem, UnifiedHistoryEventType } from "@/types";
import { useMemo } from "react";

interface ControlHistoryPageProps {
  params: {
    controlId: string;
  };
}

export default function ControlHistoryPage({ params }: ControlHistoryPageProps) {
  const control = mockSoxControls.find(c => c.id === params.controlId);

  const unifiedHistoryForThisControl = useMemo(() => {
    if (!control) return [];

    const historyItems: UnifiedHistoryItem[] = [];

    // 1. Version History
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

    // 2. Change Requests (Submissão, Rejeição, Feedback Solicitado)
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
    
    // 3. Evidence Files - Removido
    // allMockEvidenceFiles
    //   .filter(ev => ev.controlId === control.id)
    //   .forEach(ev => {
    //     historyItems.push({
    //       id: ev.id,
    //       date: ev.uploadDate,
    //       type: "EVIDENCE_UPLOADED",
    //       description: `Evidência "${ev.fileName}" enviada por ${ev.uploadedBy}.`,
    //       actor: ev.uploadedBy,
    //     });
    //   });

    return historyItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [control]);

  const getEventTypeLabel = (type: UnifiedHistoryEventType) => {
    switch (type) {
      case "CONTROL_CREATED": return "Criação de Controle";
      case "CONTROL_UPDATED": return "Atualização de Controle";
      case "CHANGE_REQUEST_SUBMITTED": return "Solicitação Enviada";
      case "CHANGE_REQUEST_APPROVED": return "Solicitação Aprovada";
      case "CHANGE_REQUEST_REJECTED": return "Solicitação Rejeitada";
      case "CHANGE_REQUEST_FEEDBACK_REQUESTED": return "Feedback Solicitado";
      // case "EVIDENCE_UPLOADED": return "Envio de Evidência"; // Removido
      default: return "Evento";
    }
  };

  if (!control) {
    return (
      <div className="space-y-6">
        <div className="flex items-center">
          <Button variant="outline" asChild>
            <Link href="/sox-matrix">
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Painel
            </Link>
          </Button>
        </div>
        <Card>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button variant="outline" asChild>
          <Link href={`/controls/${control.id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Detalhes do Controle ({control.controlId})
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ListOrdered className="w-6 h-6 text-primary" />
            <div>
              <CardTitle className="text-2xl">Histórico Unificado do Controle: {control.controlId}</CardTitle>
              <CardDescription>{control.controlName}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {unifiedHistoryForThisControl.length > 0 ? (
            <ul className="space-y-4">
              {unifiedHistoryForThisControl.map(entry => (
                <li key={`${entry.id}-${entry.type}`} className="p-4 border rounded-md shadow-sm bg-card">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-semibold text-primary">
                      {getEventTypeLabel(entry.type)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {new Date(entry.date).toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' })} por {entry.actor}
                    </p>
                  </div>
                  <p className="text-sm text-foreground mb-2">{entry.description}</p>
                  {entry.sourceId && entry.type !== "CONTROL_CREATED" && entry.type !== "CONTROL_UPDATED" && (
                     <p className="text-xs text-muted-foreground">
                        Referência: {' '}
                        <Link href={`/change-requests/${entry.sourceId}`} className="text-primary hover:underline">
                            Solicitação {entry.sourceId}
                        </Link>
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum histórico de versões disponível para este controle.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
