
// src/app/controls/[controlId]/history/page.tsx
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ListOrdered } from "lucide-react";
import Link from "next/link";
import { mockSoxControls, mockVersionHistory as allMockVersionHistory } from "@/data/mock-data";
import type { SoxControl, VersionHistoryEntry } from "@/types";

interface ControlHistoryPageProps {
  params: {
    controlId: string;
  };
}

export default function ControlHistoryPage({ params }: ControlHistoryPageProps) {
  const control = mockSoxControls.find(c => c.id === params.controlId);
  const versionHistoryForThisControl = control
    ? allMockVersionHistory.filter(vh => vh.controlId === control.id)
    : [];

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
              <CardTitle className="text-2xl">Histórico Completo do Controle: {control.controlId}</CardTitle>
              <CardDescription>{control.controlName}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {versionHistoryForThisControl.length > 0 ? (
            <ul className="space-y-4">
              {versionHistoryForThisControl.map(entry => (
                <li key={entry.id} className="p-4 border rounded-md shadow-sm bg-card">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-semibold text-primary">
                      {new Date(entry.changeDate).toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                    <p className="text-xs text-muted-foreground">Por: {entry.changedBy}</p>
                  </div>
                  <p className="text-sm text-foreground mb-2">{entry.summaryOfChanges}</p>
                  {entry.relatedChangeRequestId && (
                     <p className="text-xs text-muted-foreground">
                        Relacionado à Solicitação: {' '}
                        <Link href={`/change-requests/${entry.relatedChangeRequestId}`} className="text-primary hover:underline">
                            {entry.relatedChangeRequestId}
                        </Link>
                    </p>
                  )}
                  {/* Detalhamento de valores anteriores e novos (opcional, pode ser expandido) */}
                  {/* 
                  {entry.previousValues && Object.keys(entry.previousValues).length > 0 && (
                    <div className="mt-2 text-xs">
                      <p className="font-medium">Valores Anteriores:</p>
                      <pre className="p-2 bg-muted/50 rounded-sm whitespace-pre-wrap">{JSON.stringify(entry.previousValues, null, 2)}</pre>
                    </div>
                  )}
                  {entry.newValues && Object.keys(entry.newValues).length > 0 && (
                    <div className="mt-2 text-xs">
                      <p className="font-medium">Novos Valores:</p>
                      <pre className="p-2 bg-muted/50 rounded-sm whitespace-pre-wrap">{JSON.stringify(entry.newValues, null, 2)}</pre>
                    </div>
                  )}
                  */}
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
