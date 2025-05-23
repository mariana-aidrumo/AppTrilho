
// src/app/controls/[controlId]/page.tsx
"use client"; 

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { SoxControl, VersionHistoryEntry, EvidenceFile, ChangeRequest } from "@/types";
import { ArrowLeft, Edit2, History, Paperclip, PlusCircle, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useUserProfile } from "@/contexts/user-profile-context";
import { useSearchParams } from 'next/navigation';
import { mockSoxControls, mockVersionHistory as allMockVersionHistory, mockEvidenceFiles as allMockEvidenceFiles, mockChangeRequests } from "@/data/mock-data";

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
    ? mockChangeRequests.find(req => req.controlId === control.controlId && req.status === "Pendente")
    : null;

  const versionHistoryForThisControl = control 
    ? allMockVersionHistory.filter(vh => vh.controlId === control.id)
    : [];
  
  const evidenceForThisControl = control
    ? allMockEvidenceFiles.filter(ev => ev.controlId === control.id)
    : [];


  if (!control) {
    return <p>Controle não encontrado.</p>;
  }

  const canEditControl = isUserAdmin() || (isUserControlOwner() && currentUser.controlsOwned?.includes(control.id));
  const effectiveEditMode = isEditMode && canEditControl; 

  const renderPendingChangesList = () => {
    if (!mockPendingChangeForThisControl || !mockPendingChangeForThisControl.changes || Object.keys(mockPendingChangeForThisControl.changes).length === 0) {
      return <p className="text-sm text-muted-foreground">Nenhuma mudança específica proposta.</p>;
    }
    const items: JSX.Element[] = [];
    for (const key in mockPendingChangeForThisControl.changes) {
      if (Object.prototype.hasOwnProperty.call(mockPendingChangeForThisControl.changes, key)) {
        const typedKey = key as keyof SoxControl;
        const value = mockPendingChangeForThisControl.changes[typedKey];
        // Tradução de chaves para nomes amigáveis
        const fieldTranslations: Record<string, string> = {
            controlId: "ID do Controle", controlName: "Nome do Controle", description: "Descrição",
            controlOwner: "Dono do Controle", controlFrequency: "Frequência", controlType: "Tipo",
            status: "Status", lastUpdated: "Última Atualização", relatedRisks: "Riscos Relacionados",
            testProcedures: "Procedimentos de Teste", evidenceRequirements: "Requisitos de Evidência",
            processo: "Processo", subProcesso: "Subprocesso", modalidade: "Modalidade"
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


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" asChild>
          <Link href="/sox-matrix">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para {isUserControlOwner() ? "Meus Controles" : "Matriz SOX"}
          </Link>
        </Button>
        {canEditControl && (!mockPendingChangeForThisControl || mockPendingChangeForThisControl.controlId !== control.controlId) && (
          <Button asChild={!effectiveEditMode} onClick={effectiveEditMode ? undefined : () => { /* Lógica para solicitar alteração se não estiver em edit mode */}}>
            {effectiveEditMode ? (
                 <Link href={`/controls/${control.id}`}> {/* Link para sair do modo edição */}
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

      {mockPendingChangeForThisControl && (
        <Card className="border-yellow-400 bg-yellow-50/70 shadow-md">
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

      <Card className="shadow-lg">
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
          <Separator />
          <div>
            <h3 className="font-semibold text-muted-foreground">Requisitos de Evidência</h3>
            <p className="text-sm whitespace-pre-wrap">{control.evidenceRequirements}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><History className="w-5 h-5" /> Histórico de Versões</CardTitle>
        </CardHeader>
        <CardContent>
          {versionHistoryForThisControl.length > 0 ? (
            <ul className="space-y-3">
              {versionHistoryForThisControl.map(entry => (
                <li key={entry.id} className="text-sm border-l-2 pl-3 border-primary/50">
                  <p><strong>{new Date(entry.changeDate).toLocaleString('pt-BR')}</strong> por {entry.changedBy}</p>
                  <p className="text-muted-foreground">{entry.summaryOfChanges}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum histórico de versões disponível para este controle.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Paperclip className="w-5 h-5" /> Evidência</CardTitle>
          {canEditControl && ( 
            <Button variant="outline" size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Carregar Evidência</Button>
          )}
        </CardHeader>
        <CardContent>
          {evidenceForThisControl.length > 0 ? (
            <ul className="space-y-2">
              {evidenceForThisControl.map(file => (
                <li key={file.id} className="text-sm flex justify-between items-center p-2 border rounded-md hover:bg-muted/50">
                  <div>
                    <Link href={file.storageUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{file.fileName}</Link>
                    <p className="text-xs text-muted-foreground">
                      {(file.fileSize / (1024*1024)).toFixed(2)} MB - Carregado por {file.uploadedBy} em {new Date(file.uploadDate).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">Baixar</Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma evidência carregada para este controle.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

