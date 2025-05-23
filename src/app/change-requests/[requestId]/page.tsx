
// src/app/change-requests/[requestId]/page.tsx
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { ChangeRequest, SoxControl, VersionHistoryEntry } from "@/types";
import { ArrowLeft, CheckCircle2, XCircle, MessageSquareReply, Edit } from "lucide-react";
import Link from "next/link";
import { useUserProfile } from "@/contexts/user-profile-context";
import { mockChangeRequests, mockSoxControls, mockVersionHistory } from "@/data/mock-data";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";


interface ChangeRequestDetailPageProps {
  params: {
    requestId: string;
  };
}

export default function ChangeRequestDetailPage({ params }: ChangeRequestDetailPageProps) {
  const { currentUser, isUserAdmin } = useUserProfile();
  const { toast } = useToast();
  const router = useRouter();
  const [request, setRequest] = useState<ChangeRequest | undefined>(undefined);
  const [currentControl, setCurrentControl] = useState<SoxControl | undefined>(undefined);
  const [adminComment, setAdminComment] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [changedFields, setChangedFields] = useState<{ field: string; oldValue?: string; newValue: string }[]>([]);


  useEffect(() => {
    const foundRequest = mockChangeRequests.find(cr => cr.id === params.requestId);
    setRequest(foundRequest);

    if (foundRequest) {
      const controlForChanges = !foundRequest.controlId.startsWith("NEW-CTRL")
        ? mockSoxControls.find(c => c.controlId === foundRequest.controlId)
        : undefined;
      setCurrentControl(controlForChanges);

      if (foundRequest.changes && controlForChanges) {
        const changesArray: { field: string; oldValue?: string; newValue: string }[] = [];
        for (const key in foundRequest.changes) {
          if (Object.prototype.hasOwnProperty.call(foundRequest.changes, key)) {
            const typedKey = key as keyof SoxControl;
            const newValue = foundRequest.changes[typedKey];
            const oldValue = controlForChanges[typedKey];
            if (String(newValue) !== String(oldValue) && newValue !== undefined) {
              changesArray.push({
                field: typedKey,
                oldValue: oldValue !== undefined ? String(oldValue) : "N/A (Novo Campo)",
                newValue: String(newValue),
              });
            }
          }
        }
        setChangedFields(changesArray);
      } else if (foundRequest.changes && foundRequest.controlId.startsWith("NEW-CTRL")) {
         const newControlFields: { field: string; oldValue?: string; newValue: string }[] = [];
         Object.entries(foundRequest.changes).forEach(([key, value]) => {
            newControlFields.push({
                field: key,
                newValue: String(value)
            });
         });
         setChangedFields(newControlFields);
      }
    }
  }, [params.requestId]); // mockChangeRequests and mockSoxControls removed from dependencies to avoid stale closures if they change


  const translateFieldName = (fieldName: string): string => {
    const translations: Record<string, string> = {
      controlId: "ID do Controle", controlName: "Nome do Controle", description: "Descrição",
      controlOwner: "Dono do Controle", controlFrequency: "Frequência do Controle", controlType: "Tipo de Controle",
      status: "Status", lastUpdated: "Última Atualização", relatedRisks: "Riscos Relacionados",
      testProcedures: "Procedimentos de Teste", 
      // evidenceRequirements: "Requisitos de Evidência", // Removido
      processo: "Processo", subProcesso: "Subprocesso", modalidade: "Modalidade", justificativa: "Justificativa"
    };
    return translations[fieldName] || fieldName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  const handleAdminAction = (action: "approve" | "reject" | "request_changes") => {
    if (!request) return;
    setIsProcessing(true);

    const requestIndex = mockChangeRequests.findIndex(r => r.id === request.id);
    if (requestIndex === -1) {
      toast({ title: "Erro", description: "Solicitação não encontrada para atualização.", variant: "destructive" });
      setIsProcessing(false);
      return;
    }

    const updatedRequest: ChangeRequest = {
      ...request,
      reviewedBy: currentUser.name,
      reviewDate: new Date().toISOString(),
      adminFeedback: action === "approve" ? request.adminFeedback : adminComment || request.adminFeedback, 
    };

    let toastMessage = "";

    if (action === "approve") {
      updatedRequest.status = "Aprovado";
      toastMessage = `Solicitação ${request.id} aprovada.`;

      if (request.controlId.startsWith("NEW-CTRL-")) {
        const newControlIdNumber = mockSoxControls.length + 1;
        const newSoxControl: SoxControl = {
          id: String(newControlIdNumber),
          controlId: request.changes.controlId || `CTRL-${String(newControlIdNumber).padStart(3, '0')}`,
          controlName: request.changes.controlName || "Nome não definido",
          description: request.changes.description || "Descrição não definida",
          controlOwner: request.changes.controlOwner || "Não definido",
          controlFrequency: request.changes.controlFrequency || "Ad-hoc",
          controlType: request.changes.controlType || "Preventivo",
          status: "Ativo", // Novo controle já nasce ativo
          lastUpdated: new Date().toISOString(),
          relatedRisks: request.changes.relatedRisks || [],
          testProcedures: request.changes.testProcedures || "Não definido",
          // evidenceRequirements: request.changes.evidenceRequirements || "Não definido", // Removido
          processo: request.changes.processo,
          subProcesso: request.changes.subProcesso,
          modalidade: request.changes.modalidade,
          justificativa: request.changes.justificativa,
        };
        mockSoxControls.push(newSoxControl);
        mockVersionHistory.unshift({
          id: `vh-new-${newSoxControl.id}-${Date.now()}`,
          controlId: newSoxControl.id,
          changeDate: new Date().toISOString(),
          changedBy: currentUser.name,
          summaryOfChanges: `Controle ${newSoxControl.controlId} criado via solicitação ${request.id}.`,
          newValues: { ...newSoxControl },
          relatedChangeRequestId: request.id,
        });
      } else {
        // Atualizar controle existente
        const controlIndex = mockSoxControls.findIndex(c => c.controlId === request.controlId);
        if (controlIndex !== -1) {
          const originalControl = mockSoxControls[controlIndex];
          const updatedControl = { ...originalControl, ...request.changes, lastUpdated: new Date().toISOString() };
          mockSoxControls[controlIndex] = updatedControl;
          mockVersionHistory.unshift({
            id: `vh-update-${originalControl.id}-${Date.now()}`,
            controlId: originalControl.id,
            changeDate: new Date().toISOString(),
            changedBy: currentUser.name,
            summaryOfChanges: `Alterações da solicitação ${request.id} aplicadas ao controle ${originalControl.controlId}.`,
            previousValues: { ...originalControl }, 
            newValues: { ...request.changes },
            relatedChangeRequestId: request.id,
          });
        } else {
          toastMessage = `Controle ${request.controlId} não encontrado para atualização.`;
           updatedRequest.status = "Pendente"; 
        }
      }
    } else if (action === "reject") {
      if (!adminComment.trim()) {
        toast({ title: "Ação Requerida", description: "Por favor, forneça um comentário para rejeitar.", variant: "destructive" });
        setIsProcessing(false);
        return;
      }
      updatedRequest.status = "Rejeitado";
      updatedRequest.adminFeedback = adminComment;
      toastMessage = `Solicitação ${request.id} rejeitada.`;
    } else if (action === "request_changes") {
      if (!adminComment.trim()) {
        toast({ title: "Ação Requerida", description: "Por favor, forneça um comentário para solicitar ajustes.", variant: "destructive" });
        setIsProcessing(false);
        return;
      }
      updatedRequest.status = "Aguardando Feedback do Dono";
      updatedRequest.adminFeedback = adminComment;
      toastMessage = `Ajustes solicitados para ${request.id}. Dono notificado.`;
    }

    mockChangeRequests[requestIndex] = updatedRequest;
    setRequest(updatedRequest); 

    toast({
      title: "Sucesso!",
      description: toastMessage,
    });
    setAdminComment("");
    setIsProcessing(false);
    router.refresh(); // Força a atualização dos dados na UI se estiver usando server components ou para listas dinâmicas
  };

  if (!request) {
    return <p>Solicitação de Alteração não encontrada.</p>;
  }

  const isNewControlRequest = request.controlId.startsWith("NEW-CTRL");

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button variant="outline" asChild>
          <Link href="/pending-approvals">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para {isUserAdmin() ? "Aprovações Pendentes" : "Minhas Solicitações"}
          </Link>
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">Detalhes da Solicitação de Alteração</CardTitle>
              <CardDescription>
                Revise as alterações propostas para: {' '}
                {isNewControlRequest ? (
                  <span className="text-primary font-semibold">{`Novo Controle Proposto (ID Sugerido: ${request.changes.controlId || 'N/A'})`}</span>
                ) : (
                  <Link
                    href={`/controls/${mockSoxControls.find(c => c.controlId === request.controlId)?.id}`}
                    className="text-primary hover:underline font-semibold"
                  >
                    {request.controlId}
                  </Link>
                )}
              </CardDescription>
            </div>
            <span className={`px-3 py-1.5 text-sm font-semibold rounded-full ${
              request.status === "Pendente" ? "bg-yellow-100 text-yellow-700" :
              request.status === "Aprovado" ? "bg-green-100 text-green-700" :
              request.status === "Rejeitado" ? "bg-red-100 text-red-700" :
              request.status === "Em Análise" ? "bg-blue-100 text-blue-700" :
              request.status === "Aguardando Feedback do Dono" ? "bg-orange-100 text-orange-700" :
              "bg-gray-100 text-gray-700"
            }`}>
              {request.status}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold text-muted-foreground">ID da Solicitação</h3>
            <p className="text-sm">{request.id}</p>
          </div>
          <Separator />
          <div>
            <h3 className="font-semibold text-muted-foreground">Solicitado Por</h3>
            <p className="text-sm">{request.requestedBy}</p>
          </div>
          <Separator />
          <div>
            <h3 className="font-semibold text-muted-foreground">Data da Solicitação</h3>
            <p className="text-sm">{new Date(request.requestDate).toLocaleString('pt-BR')}</p>
          </div>
          <Separator />
          <div>
            <h3 className="font-semibold text-muted-foreground">Comentários do Solicitante</h3>
            <p className="text-sm italic">{request.comments || "Nenhum comentário fornecido."}</p>
          </div>
          <Separator />
          
          <div>
            <h3 className="font-semibold text-muted-foreground mb-2">
              {isNewControlRequest ? "Detalhes do Novo Controle Proposto" : "Alterações Propostas"}
            </h3>
            {changedFields.length > 0 ? ( 
              <div className="space-y-3">
                {changedFields.map(change => (
                  <div key={change.field} className={`p-3 border rounded-md ${isNewControlRequest ? 'bg-blue-50' : 'bg-muted/30'}`}>
                    <p className="text-sm font-medium">{translateFieldName(change.field)}</p>
                    {!isNewControlRequest && change.oldValue !== undefined && (
                        <div className="mt-1 p-2 rounded-sm bg-red-50 text-red-700 text-xs">
                            <strong>Antigo:</strong> <span className="line-through">{change.oldValue}</span>
                        </div>
                    )}
                    <div className={`mt-1 p-2 rounded-sm ${isNewControlRequest ? 'text-blue-700' : 'bg-green-50 text-green-700'} text-xs ${!isNewControlRequest && change.oldValue !== undefined ? '' : 'mt-0'}`}>
                        <strong>{isNewControlRequest ? "Valor Proposto:" : "Novo:"}</strong> {change.newValue}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma alteração de campo específica listada.</p>
            )}
          </div>

          {request.adminFeedback && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold text-muted-foreground">Feedback do Administrador</h3>
                <p className="text-sm italic p-2 bg-yellow-50 border border-yellow-200 rounded-md">{request.adminFeedback}</p>
              </div>
            </>
          )}

          {request.status === "Aguardando Feedback do Dono" && currentUser.name === request.requestedBy && (
             <>
              <Separator />
              <Card className="bg-orange-50 border-orange-300">
                <CardHeader>
                  <CardTitle className="text-orange-700 text-lg">Ação Necessária</CardTitle>
                  <CardDescription className="text-orange-600">O administrador solicitou ajustes nesta proposta. Revise o feedback acima e reenvie suas alterações.</CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button variant="outline" className="border-orange-500 text-orange-600 hover:bg-orange-100" disabled>
                    <Edit className="mr-2 h-4 w-4" /> Revisar e Reenviar Proposta (Simulado)
                  </Button>
                </CardFooter>
              </Card>
             </>
          )}

        </CardContent>
        {request.status === "Pendente" && isUserAdmin() && ( 
            <CardFooter className="flex flex-col space-y-4 items-stretch pt-4 border-t">
                <div>
                    <Label htmlFor="adminComment" className="text-sm font-medium text-muted-foreground">Comentário do Administrador (para Rejeição ou Solicitação de Ajustes)</Label>
                    <Textarea 
                        id="adminComment" 
                        value={adminComment} 
                        onChange={(e) => setAdminComment(e.target.value)}
                        placeholder="Forneça um feedback claro para o solicitante..."
                        rows={3}
                        className="mt-1"
                    />
                </div>
                <div className="flex justify-end space-x-2">
                    <Button 
                        variant="outline" 
                        onClick={() => handleAdminAction("request_changes")} 
                        disabled={isProcessing || !adminComment.trim()}
                        className="border-orange-500 text-orange-500 hover:bg-orange-50 hover:text-orange-600"
                    >
                        <MessageSquareReply className="mr-2 h-4 w-4" /> Solicitar Ajustes
                    </Button>
                    <Button 
                        variant="outline" 
                        onClick={() => handleAdminAction("reject")} 
                        disabled={isProcessing || !adminComment.trim()}
                        className="border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600"
                    >
                        <XCircle className="mr-2 h-4 w-4" /> Rejeitar
                    </Button>
                    <Button 
                        onClick={() => handleAdminAction("approve")} 
                        disabled={isProcessing}
                        className="bg-green-600 hover:bg-green-700 text-white"
                    >
                        <CheckCircle2 className="mr-2 h-4 w-4" /> Aprovar
                    </Button>
                </div>
            </CardFooter>
        )}
      </Card>
    </div>
  );
}
