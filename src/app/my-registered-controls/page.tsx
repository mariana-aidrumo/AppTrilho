// src/app/my-registered-controls/page.tsx
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SoxControl, ChangeRequest } from "@/types";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FilePlus2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useUserProfile } from "@/contexts/user-profile-context";
import { useState, useMemo, useEffect } from "react";
import { getSoxControls, getChangeRequests } from "@/services/sox-service";

export default function MyControlsPage() {
  const { currentUser, isUserControlOwner } = useUserProfile();
  const [isLoading, setIsLoading] = useState(true);
  const [soxControls, setSoxControls] = useState<SoxControl[]>([]);
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);

  useEffect(() => {
    const loadData = async () => {
      if (!isUserControlOwner()) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const [controlsData, requestsData] = await Promise.all([
          getSoxControls(),
          getChangeRequests(),
        ]);
        setSoxControls(controlsData);
        setChangeRequests(requestsData);
      } catch (error) {
        console.error("Failed to load controls data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [isUserControlOwner, currentUser.id]);


  if (!isUserControlOwner()) {
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
                <CardTitle>Acesso Negado</CardTitle>
                </CardHeader>
                <CardContent>
                <p>Esta página é destinada apenas para Donos de Controle.</p>
                </CardContent>
            </Card>
      </div>
    );
  }

  const userOwnedControlIds = currentUser.controlsOwned || [];

  const myActiveControls = useMemo(() =>
    soxControls.filter(control =>
      userOwnedControlIds.includes(control.id) &&
      control.status === "Ativo" &&
      !changeRequests.some(cr =>
        cr.controlId === control.controlId &&
        cr.requestedBy === currentUser.name &&
        (cr.status === "Pendente" || cr.status === "Em Análise" || cr.status === "Aguardando Feedback do Dono")
      )
    ), [soxControls, changeRequests, userOwnedControlIds, currentUser.name]);

  const myControlsWithPendingChanges = useMemo(() => {
    const pendingChanges: { control: SoxControl, request: ChangeRequest }[] = [];
    changeRequests.forEach(cr => {
      if (cr.requestedBy === currentUser.name &&
          !cr.controlId.startsWith("NEW-CTRL-") &&
          (cr.status === "Pendente" || cr.status === "Em Análise" || cr.status === "Aguardando Feedback do Dono")) {
        const control = soxControls.find(c => c.controlId === cr.controlId && userOwnedControlIds.includes(c.id));
        if (control) {
          pendingChanges.push({ control, request: cr });
        }
      }
    });
    return pendingChanges;
  }, [userOwnedControlIds, currentUser.name, changeRequests, soxControls]);

  const myPendingNewControlRequests = useMemo(() =>
    changeRequests.filter(
      req => req.requestedBy === currentUser.name &&
             req.controlId.startsWith("NEW-CTRL-") &&
             (req.status === "Pendente" || req.status === "Em Análise" || req.status === "Aguardando Feedback do Dono")
    ), [currentUser.name, changeRequests]);

  if (isLoading) {
      return (
          <div className="flex items-center justify-center h-screen">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="ml-2">Carregando seus controles...</p>
          </div>
      );
  }

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center">
        <Button variant="outline" asChild>
          <Link href="/sox-matrix">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Painel (Visão Geral)
          </Link>
        </Button>
      </div>

      <Card className="shadow-md w-full">
        <CardHeader>
          <CardTitle>Meus Controles Ativos</CardTitle>
          <CardDescription>
            Seus controles ativos que não possuem alterações pendentes solicitadas por você.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {myActiveControls.length > 0 ? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Processo</TableHead>
                    <TableHead>Subprocesso</TableHead>
                    <TableHead className="w-[100px]">Código</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>N3 Responsável</TableHead>
                    <TableHead>Frequência</TableHead>
                    <TableHead>Modalidade</TableHead>
                    <TableHead>P/D</TableHead>
                    <TableHead className="text-right min-w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myActiveControls.map((control) => (
                    <TableRow key={control.id}>
                      <TableCell>{control.processo}</TableCell>
                      <TableCell>{control.subProcesso}</TableCell>
                      <TableCell className="font-medium">
                        {control.controlId}
                      </TableCell>
                      <TableCell>{control.controlName}</TableCell>
                      <TableCell>{control.responsavel || "N/A"}</TableCell>
                      <TableCell>{control.n3Responsavel || "N/A"}</TableCell>
                      <TableCell>{control.controlFrequency}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                          control.modalidade === "Manual" ? "bg-purple-100 text-purple-700" :
                          control.modalidade === "Automático" ? "bg-blue-100 text-blue-700" :
                          control.modalidade === "Híbrido" ? "bg-teal-100 text-teal-700" :
                          "bg-gray-100 text-gray-700"
                        }`}>
                          {control.modalidade}
                        </span>
                      </TableCell>
                      <TableCell>{control.controlType}</TableCell>
                      <TableCell className="text-right">
                        {/* Ações removidas */}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="mt-4 text-center text-muted-foreground">
              Você não possui nenhum controle ativo nesta categoria.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-md w-full">
        <CardHeader>
            <CardTitle>Meus Controles com Alterações Solicitadas</CardTitle>
            <CardDescription>Seus controles existentes com propostas de alteração pendentes de aprovação.</CardDescription>
        </CardHeader>
        <CardContent>
            {myControlsWithPendingChanges.length > 0 ? (
            <div className="rounded-md border overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ID Controle</TableHead>
                            <TableHead>Nome do Controle</TableHead>
                            <TableHead>ID Solicitação</TableHead>
                            <TableHead>Status Solicitação</TableHead>
                            <TableHead className="text-right min-w-[150px]">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {myControlsWithPendingChanges.map(item => (
                            <TableRow key={item.request.id}>
                                <TableCell>
                                    {item.control.controlId}
                                </TableCell>
                                <TableCell>{item.control.controlName}</TableCell>
                                <TableCell>{item.request.id}</TableCell>
                                <TableCell>
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                                        item.request.status === "Pendente" ? "bg-yellow-100 text-yellow-700" :
                                        item.request.status === "Em Análise" ? "bg-blue-100 text-blue-700" :
                                        item.request.status === "Aguardando Feedback do Dono" ? "bg-orange-100 text-orange-700" :
                                        "bg-gray-100 text-gray-700"
                                    }`}>
                                        {item.request.status}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right">
                                    {/* Ação removida */}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            ) : (
            <p className="mt-4 text-center text-muted-foreground">Nenhum de seus controles possui alterações solicitadas pendentes.</p>
            )}
        </CardContent>
      </Card>

      <Card className="shadow-md w-full">
        <CardHeader>
            <CardTitle>Minhas Propostas de Novos Controles Pendentes</CardTitle>
            <CardDescription>Acompanhe os novos controles que você solicitou e aguardam aprovação.</CardDescription>
        </CardHeader>
        <CardContent>
            {myPendingNewControlRequests.length > 0 ? (
            <div className="rounded-md border overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ID Proposta</TableHead>
                            <TableHead>Nome Proposto</TableHead>
                            <TableHead>Data Solicitação</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right min-w-[150px]">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                         {myPendingNewControlRequests.map(request => (
                            <TableRow key={request.id}>
                                <TableCell>{request.changes.controlId || request.controlId}</TableCell>
                                <TableCell>{request.changes.controlName}</TableCell>
                                <TableCell>{new Date(request.requestDate).toLocaleDateString('pt-BR')}</TableCell>
                                <TableCell>
                                     <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                                        request.status === "Pendente" ? "bg-yellow-100 text-yellow-700" :
                                        request.status === "Em Análise" ? "bg-blue-100 text-blue-700" :
                                        "bg-gray-100 text-gray-700"
                                    }`}>
                                        {request.status}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right">
                                    {/* Ação removida */}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            ) : (
            <p className="mt-4 text-center text-muted-foreground">Você não tem propostas de novos controles pendentes.</p>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
