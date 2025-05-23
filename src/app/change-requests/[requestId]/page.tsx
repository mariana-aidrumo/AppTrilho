// src/app/change-requests/[requestId]/page.tsx
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { ChangeRequest, SoxControl } from "@/types";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { useUserProfile } from "@/contexts/user-profile-context";

// Dados mocados para uma única solicitação de alteração
const mockChangeRequest: ChangeRequest = {
  id: "cr1", // Este ID será parte da URL
  controlId: "FIN-001",
  requestedBy: "John Doe",
  requestDate: new Date(Date.now() - 86400000 * 2).toISOString(), 
  changes: { 
    description: "Revisão mensal e aprovação das conciliações bancárias pelo gerente financeiro para garantir que todas as transações sejam registradas com precisão. Quaisquer discrepâncias identificadas devem ser resolvidas em 5 dias úteis.",
    controlOwner: "Departamento Financeiro (Gerente)",
    testProcedures: "Verificar a aprovação da conciliação e acompanhar as discrepâncias com mais de 5 dias."
  },
  status: "Pendente",
  comments: "Solicitação inicial para atualizar detalhes do controle com base na nova política.",
};

// Dados mocados do controle atual (para comparação)
const mockCurrentControl: Partial<SoxControl> = {
  controlId: "FIN-001",
  controlName: "Revisão de Conciliação Bancária",
  description: "Revisão mensal e aprovação das conciliações bancárias.",
  controlOwner: "John Doe", // Para mostrar mudança
  testProcedures: "Verificar a aprovação da conciliação."
};


interface ChangeRequestDetailPageProps {
  params: {
    requestId: string;
  };
}

export default function ChangeRequestDetailPage({ params }: ChangeRequestDetailPageProps) {
  const { isUserAdmin } = useUserProfile();
  
  // Em um aplicativo real, buscar dados da solicitação de alteração com base em params.requestId
  // e potencialmente os dados do controle atual para comparação.
  // Para a simulação, usamos o mock se o ID corresponder, senão tratamos como não encontrado.
  const request = params.requestId === mockChangeRequest.id ? mockChangeRequest : null;
  const currentControl = mockCurrentControl; // Para mostrar diferenças

  if (!request) {
    return <p>Solicitação de Alteração não encontrada.</p>;
  }

  const getChangedFields = () => {
    const changed: { field: string; oldValue?: string; newValue: string }[] = [];
    if (request.changes) {
      for (const key in request.changes) {
        if (Object.prototype.hasOwnProperty.call(request.changes, key)) {
          const typedKey = key as keyof SoxControl;
          const newValue = request.changes[typedKey];
          const oldValue = currentControl[typedKey];
          
          if (newValue !== oldValue || (newValue && oldValue === undefined)) {
            changed.push({
              field: typedKey,
              oldValue: oldValue as string | undefined,
              newValue: newValue as string,
            });
          }
        }
      }
    }
    return changed;
  };

  const changedFields = getChangedFields();

  const translateFieldName = (fieldName: string): string => {
    const translations: Record<string, string> = {
      controlId: "ID do Controle",
      controlName: "Nome do Controle",
      description: "Descrição",
      controlOwner: "Dono do Controle",
      controlFrequency: "Frequência do Controle",
      controlType: "Tipo de Controle",
      status: "Status",
      lastUpdated: "Última Atualização",
      relatedRisks: "Riscos Relacionados",
      testProcedures: "Procedimentos de Teste",
      evidenceRequirements: "Requisitos de Evidência",
      processo: "Processo",
      subProcesso: "Subprocesso",
      modalidade: "Modalidade",
    };
    return translations[fieldName] || fieldName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };


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
                Revise as alterações propostas para o controle: <Link href={`/controls/${request.controlId.startsWith("NEW-CTRL") ? request.changes.controlId : request.controlId }`} className="text-primary hover:underline">{request.controlId.startsWith("NEW-CTRL") ? `Novo Controle Proposto (${request.changes.controlId || 'ID pendente'})` : request.controlId}</Link>
              </CardDescription>
            </div>
            <span className={`px-3 py-1.5 text-sm font-semibold rounded-full ${
              request.status === "Pendente" ? "bg-yellow-100 text-yellow-700" :
              request.status === "Aprovado" ? "bg-green-100 text-green-700" :
              "bg-red-100 text-red-700"
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
            <h3 className="font-semibold text-muted-foreground mb-2">Alterações Propostas</h3>
            {request.controlId.startsWith("NEW-CTRL") && Object.keys(request.changes).length > 0 ? (
                 <div className="mt-4 p-3 border rounded-md bg-blue-50">
                    <p className="text-sm font-medium text-blue-700">Detalhes do Novo Controle Proposto:</p>
                    <ul className="list-disc list-inside text-sm ml-4 mt-1 text-blue-600 space-y-1">
                         {Object.entries(request.changes).map(([key, value]) => (
                            <li key={key}><strong>{translateFieldName(key)}:</strong> {String(value)}</li>
                        ))}
                    </ul>
                 </div>
            ) : changedFields.length > 0 ? ( 
              <div className="space-y-3">
                {changedFields.map(change => (
                  <div key={change.field} className="p-3 border rounded-md bg-muted/30">
                    <p className="text-sm font-medium">{translateFieldName(change.field)}</p>
                    {change.oldValue && (
                        <div className="mt-1 p-2 rounded-sm bg-red-50 text-red-700 text-xs">
                            <strong>Antigo:</strong> <span className="line-through">{change.oldValue}</span>
                        </div>
                    )}
                    <div className={`mt-1 p-2 rounded-sm bg-green-50 text-green-700 text-xs ${change.oldValue ? '' : 'mt-0'}`}>
                        <strong>Novo:</strong> {change.newValue}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma alteração de campo específica listada.</p>
            )}
          </div>

        </CardContent>
        {request.status === "Pendente" && isUserAdmin() && ( // Apenas Admin pode aprovar/rejeitar
            <CardFooter className="flex justify-end space-x-2">
                <Button variant="outline" className="border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600">
                <XCircle className="mr-2 h-4 w-4" /> Rejeitar
                </Button>
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                <CheckCircle2 className="mr-2 h-4 w-4" /> Aprovar
                </Button>
            </CardFooter>
        )}
      </Card>
    </div>
  );
}
