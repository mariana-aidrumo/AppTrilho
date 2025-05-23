// src/app/controls/[controlId]/page.tsx
"use client"; 

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { SoxControl, VersionHistoryEntry, EvidenceFile, ChangeRequest } from "@/types";
import { ArrowLeft, Edit2, History, Paperclip, PlusCircle, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useUserProfile } from "@/contexts/user-profile-context";
import { useSearchParams } from 'next/navigation'; // Para ler query params como `?edit=true`

// Dados mocados para um único controle
const mockControl: SoxControl = {
  id: "1", // Corresponde ao ID usado em `ownerUser.controlsOwned` e `mockControlsFull`
  controlId: "FIN-001",
  controlName: "Revisão de Conciliação Bancária",
  description: "Revisão mensal e aprovação das conciliações bancárias pelo gerente financeiro para garantir que todas as transações sejam registradas com precisão e quaisquer discrepâncias sejam identificadas e resolvidas em tempo hábil.",
  controlOwner: "Alice Wonderland", // Mesmo dono que em mockControlsFull
  controlFrequency: "Mensal",
  controlType: "Detectivo",
  status: "Ativo",
  lastUpdated: new Date(Date.now() - 86400000 * 5).toISOString(), // 5 dias atrás
  relatedRisks: ["Demonstração Financeira Incorreta", "Transações Fraudulentas", "Passivos Não Registrados"],
  testProcedures: "Verificar se as conciliações bancárias são realizadas mensalmente, revisadas independentemente e todos os itens de conciliação são investigados e compensados adequadamente. Obter uma amostra das conciliações bancárias concluídas e verificar as assinaturas e datas do preparador e revisor.",
  evidenceRequirements: "Relatório de conciliação bancária assinado, cronogramas de suporte para itens de conciliação e evidência de acompanhamento de itens pendentes.",
  processo: "Relatórios Financeiros",
  subProcesso: "Fechamento Mensal",
  modalidade: "Manual",
};

const mockVersionHistory: VersionHistoryEntry[] = [
  { id: "vh1", controlId: "1", changeDate: new Date(Date.now() - 86400000 * 10).toISOString(), changedBy: "Usuário Admin", summaryOfChanges: "Controle criado.", previousValues: {}, newValues: { controlName: "Revisão de Conciliação Bancária" } },
  { id: "vh2", controlId: "1", changeDate: new Date(Date.now() - 86400000 * 7).toISOString(), changedBy: "Maria Santos", summaryOfChanges: "Descrição e dono atualizados.", previousValues: { description: "Desc. inicial", controlOwner: "Dono Antigo" }, newValues: { description: mockControl.description, controlOwner: "João Silva" } },
];

const mockEvidence: EvidenceFile[] = [
  { id: "ev1", controlId: "1", fileName: "Q1_Conciliacao_Bancaria_Assinada.pdf", fileType: "application/pdf", fileSize: 1024 * 250, uploadDate: new Date(Date.now() - 86400000 * 3).toISOString(), uploadedBy: "João Silva", storageUrl: "#" },
  { id: "ev2", controlId: "1", fileName: "Itens_Conciliacao_Q1.xlsx", fileType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileSize: 1024 * 80, uploadDate: new Date(Date.now() - 86400000 * 3).toISOString(), uploadedBy: "João Silva", storageUrl: "#" },
];

// Simula uma solicitação de mudança pendente para este controle específico.
// Para fins de teste, você pode alternar entre null e um objeto ChangeRequest.
const mockPendingChangeForThisControl: ChangeRequest | null = {
    id: "cr-fin001-pending",
    controlId: "FIN-001", // ou "1" se estiver usando o ID numérico
    requestedBy: "Carlos Pereira",
    requestDate: new Date(Date.now() - 86400000 * 1).toISOString(), // 1 dia atrás
    changes: {
        description: "Nova descrição proposta: Revisão e aprovação DIÁRIA das conciliações bancárias pelo gerente financeiro para garantir que todas as transações sejam registradas com precisão e quaisquer discrepâncias sejam identificadas e resolvidas em tempo hábil, com foco em transações de alto valor.",
        controlFrequency: "Diário",
    },
    status: "Pendente",
    comments: "Atualização para refletir a nova política de revisão diária e foco em transações de alto risco."
};


interface ControlDetailPageProps {
  params: {
    controlId: string; 
  };
}

export default function ControlDetailPage({ params }: ControlDetailPageProps) {
  const { currentUser, isUserAdmin, isUserControlOwner } = useUserProfile();
  const searchParams = useSearchParams();
  const isEditMode = searchParams.get('edit') === 'true';


  // Em um aplicativo real, buscar dados do controle com base em params.controlId
  // Aqui, estamos usando o ID numérico do mockControl, mas a lógica pode precisar
  // encontrar por `control.controlId` (ex: "FIN-001") se isso for passado na URL.
  // Para esta simulação, assumimos que params.controlId é o 'id' numérico.
  const control = mockControl.id === params.controlId ? mockControl : null; 

  if (!control) {
    return <p>Controle não encontrado.</p>;
  }

  const canEditControl = isUserAdmin() || (isUserControlOwner() && currentUser.controlsOwned?.includes(control.id));
  const effectiveEditMode = isEditMode && canEditControl; // Modo de edição real só se permitido


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" asChild>
          <Link href="/sox-matrix">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para {isUserControlOwner() ? "Meus Controles" : "Matriz SOX"}
          </Link>
        </Button>
        {/* Botão de Editar/Solicitar Alteração */}
        {canEditControl && !mockPendingChangeForThisControl && (
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
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                    {Object.entries(mockPendingChangeForThisControl.changes).map(([key, value]) = (
                        <li key={key}><strong>{key.charAt(0).toUpperCase() + key.slice(1)}:</strong> {String(value)}</li>
                    ))}
                </ul>
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
          {mockVersionHistory.length > 0 ? (
            <ul className="space-y-3">
              {mockVersionHistory.map(entry => (
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
          {canEditControl && ( // Dono ou Admin podem carregar evidência
            <Button variant="outline" size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Carregar Evidência</Button>
          )}
        </CardHeader>
        <CardContent>
          {mockEvidence.length > 0 ? (
            <ul className="space-y-2">
              {mockEvidence.map(file => (
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
