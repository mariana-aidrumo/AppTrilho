
// src/app/sox-matrix/page.tsx
'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SoxControl, ChangeRequest } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, FileEdit, History, ChevronRight, Filter, RotateCcw, Search, CheckSquare, FilePlus2, ListChecks, ExternalLink, TrendingUp, Users, AlertCircle, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { useUserProfile } from "@/contexts/user-profile-context";
import { mockSoxControls, mockProcessos, mockSubProcessos, mockDonos, mockChangeRequests } from "@/data/mock-data";
import { useState, useMemo } from "react";

export default function SoxMatrixPage() {
  const { currentUser, isUserAdmin, isUserControlOwner } = useUserProfile();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProcess, setSelectedProcess] = useState("Todos");
  const [selectedSubProcess, setSelectedSubProcess] = useState("Todos");
  const [selectedOwner, setSelectedOwner] = useState("Todos");


  // Filtros para o Dono do Controle
  let ownerRegisteredControls: SoxControl[] = [];
  let ownerControlsWithPendingChanges: { control: SoxControl, request: ChangeRequest }[] = [];
  let ownerPendingNewControlRequests: ChangeRequest[] = [];

  if (isUserControlOwner()) {
    const userOwnedControlIds = currentUser.controlsOwned || [];

    // Definição de "Controles Registrados" para o Dono
    ownerRegisteredControls = mockSoxControls.filter(control =>
      userOwnedControlIds.includes(control.id) &&
      control.status === "Ativo" &&
      !mockChangeRequests.some(cr => // Não tem alteração pendente solicitada PELO DONO
        cr.controlId === control.controlId &&
        cr.requestedBy === currentUser.name &&
        (cr.status === "Pendente" || cr.status === "Em Análise" || cr.status === "Aguardando Feedback do Dono")
      )
    );

    // Definição de "Controles com Alterações Solicitadas" pelo Dono
    mockChangeRequests.forEach(cr => {
      if (cr.requestedBy === currentUser.name && // Solicitado pelo dono
          !cr.controlId.startsWith("NEW-CTRL-") && // É uma alteração, não um novo controle
          (cr.status === "Pendente" || cr.status === "Em Análise" || cr.status === "Aguardando Feedback do Dono")) { // Status pendente
        const control = mockSoxControls.find(c => c.controlId === cr.controlId && userOwnedControlIds.includes(c.id));
        if (control) {
          ownerControlsWithPendingChanges.push({ control, request: cr });
        }
      }
    });

    // Definição de "Propostas de Novos Controles Pendentes" pelo Dono
    ownerPendingNewControlRequests = mockChangeRequests.filter(
      req => req.requestedBy === currentUser.name &&
             req.controlId.startsWith("NEW-CTRL-") && // É uma proposta de novo controle
             (req.status === "Pendente" || req.status === "Em Análise" || req.status === "Aguardando Feedback do Dono") // Status pendente
    );
  }

  // Dados para Admin
  const adminTotalActiveControls = useMemo(() => mockSoxControls.filter(c => c.status === "Ativo").length, [mockSoxControls]);
  const adminTotalOwners = useMemo(() => Array.from(new Set(mockSoxControls.map(c => c.controlOwner))).length, [mockSoxControls]);
  const adminTotalPendingRequests = useMemo(() => mockChangeRequests.filter(req => req.status === "Pendente" || req.status === "Em Análise" || req.status === "Aguardando Feedback do Dono").length, [mockChangeRequests]);


  const filteredAdminControls = useMemo(() => {
    return mockSoxControls.filter(control => {
      const matchesSearch = searchTerm === "" ||
        control.controlId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        control.controlName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        control.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesProcess = selectedProcess === "Todos" || control.processo === selectedProcess;
      const matchesSubProcess = selectedSubProcess === "Todos" || control.subProcesso === selectedSubProcess;
      const matchesOwner = selectedOwner === "Todos" || control.controlOwner === selectedOwner;
      const isActive = control.status === "Ativo"; // Filtro principal para admin

      return isActive && matchesSearch && matchesProcess && matchesSubProcess && matchesOwner;
    });
  }, [mockSoxControls, searchTerm, selectedProcess, selectedSubProcess, selectedOwner]);


  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedProcess("Todos");
    setSelectedSubProcess("Todos");
    setSelectedOwner("Todos");
  };


  return (
    <div className="space-y-6">
      {/* Cards de Ação e KPIs - Admin */}
      {isUserAdmin() && (
          <div className="grid grid-cols-1 gap-6 mb-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"> {/* Ajustado para 4 colunas */}
            {/* Cards de Ação */}
            <Card className="shadow-md hover:shadow-lg transition-shadow col-span-1">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-medium">Aprovações Pendentes</CardTitle>
                <Link href="/pending-approvals"><CheckSquare className="h-5 w-5 text-primary cursor-pointer" /></Link>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Revise todas as solicitações.
                </p>
                <Button variant="outline" size="sm" className="mt-3 w-full" asChild>
                  <Link href="/pending-approvals">Ver Aprovações</Link>
                </Button>
              </CardContent>
            </Card>
            <Card className="shadow-md hover:shadow-lg transition-shadow col-span-1">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-medium">Propor Novo Controle</CardTitle>
                <Link href="/new-control"><FilePlus2 className="h-5 w-5 text-primary cursor-pointer" /></Link>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Crie e envie um novo controle.
                </p>
                <Button variant="outline" size="sm" className="mt-3 w-full" asChild>
                  <Link href="/new-control">Propor Controle</Link>
                </Button>
              </CardContent>
            </Card>
            {/* Cards de KPI */}
            <Card className="shadow-md col-span-1">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-medium">Controles Ativos</CardTitle>
                <TrendingUp className="h-5 w-5 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{adminTotalActiveControls}</div>
                <p className="text-xs text-muted-foreground">Total de controles atualmente ativos</p>
              </CardContent>
            </Card>
            <Card className="shadow-md col-span-1">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-medium">Donos de Controles</CardTitle>
                <Users className="h-5 w-5 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{adminTotalOwners}</div>
                <p className="text-xs text-muted-foreground">Total de donos de controles únicos</p>
              </CardContent>
            </Card>
            <Card className="shadow-md col-span-1">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-medium">Solicitações Pendentes</CardTitle>
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{adminTotalPendingRequests}</div>
                <p className="text-xs text-muted-foreground">Total de solicitações aguardando ação</p>
              </CardContent>
            </Card>
            <Card className="shadow-md hover:shadow-lg transition-shadow col-span-1">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-medium">Histórico da Matriz</CardTitle>
                <Link href="/matrix-history"><History className="h-5 w-5 text-primary cursor-pointer" /></Link>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                   Acesse o histórico da matriz.
                </p>
                 <Button variant="outline" size="sm" className="mt-3 w-full" asChild>
                  <Link href="/matrix-history">Ver Histórico</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

      {/* Visão Geral para Dono do Controle */}
      {isUserControlOwner() && (
        <div className="space-y-6">
           <div className="grid grid-cols-1 gap-6 mb-6 md:grid-cols-2">
            <Card className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">Minhas Solicitações</CardTitle>
                 <Link href="/pending-approvals"><ListChecks className="h-5 w-5 text-primary cursor-pointer" /></Link>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Acompanhe o status das suas solicitações.
                </p>
                <Button variant="outline" size="sm" className="mt-3 w-full" asChild>
                  <Link href="/pending-approvals">Ver Solicitações</Link>
                </Button>
              </CardContent>
            </Card>
            <Card className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">Propor Novo Controle</CardTitle>
                <Link href="/new-control"><FilePlus2 className="h-5 w-5 text-primary cursor-pointer" /></Link>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Envie uma proposta para um novo controle SOX.
                </p>
                <Button variant="outline" size="sm" className="mt-3 w-full" asChild>
                  <Link href="/new-control">Propor Controle</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Meus Controles Registrados</CardTitle>
              <CardDescription>Seus controles ativos e sem alterações pendentes solicitadas por você.</CardDescription>
            </CardHeader>
            <CardContent>
              {ownerRegisteredControls.length > 0 ? (
                <ul className="space-y-2">
                  {ownerRegisteredControls.slice(0, 3).map(control => (
                    <li key={control.id} className="flex justify-between items-center p-3 border rounded-md hover:bg-muted/30">
                      <div>
                        <Link href={`/controls/${control.id}`} className="text-primary hover:underline font-medium">
                          {control.controlId}: {control.controlName}
                        </Link>
                        <p className="text-xs text-muted-foreground">{control.processo} / {control.subProcesso}</p>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/controls/${control.id}`}>Ver Detalhes <ExternalLink className="ml-2 h-3 w-3"/></Link>
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">Você não possui controles registrados nesta categoria.</p>
              )}
              {ownerRegisteredControls.length > 0 && (
                <div className="mt-4 text-right">
                  <Button variant="link" asChild>
                    <Link href="/my-registered-controls">Ver todos os controles registrados ({ownerRegisteredControls.length})</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Meus Controles com Alterações Solicitadas</CardTitle>
              <CardDescription>Seus controles existentes com propostas de alteração pendentes de aprovação.</CardDescription>
            </CardHeader>
            <CardContent>
              {ownerControlsWithPendingChanges.length > 0 ? (
                <ul className="space-y-2">
                  {ownerControlsWithPendingChanges.slice(0, 3).map(item => (
                    <li key={item.request.id} className="flex justify-between items-center p-3 border rounded-md hover:bg-muted/30">
                      <div>
                        <Link href={`/controls/${item.control.id}`} className="text-primary hover:underline font-medium">
                          {item.control.controlId}: {item.control.controlName}
                        </Link>
                        <p className="text-xs text-muted-foreground">Solicitação: {item.request.id} (Status: {item.request.status})</p>
                      </div>
                       <Button variant="outline" size="sm" asChild>
                        <Link href={`/change-requests/${item.request.id}`}>Ver Solicitação <ExternalLink className="ml-2 h-3 w-3"/></Link>
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">Nenhum de seus controles possui alterações solicitadas pendentes.</p>
              )}
              {ownerControlsWithPendingChanges.length > 3 && (
                <div className="mt-4 text-right">
                  <Button variant="link" asChild>
                    {/* Link para a aba correta na página de solicitações */}
                    <Link href="/pending-approvals">Ver todas as alterações solicitadas ({ownerControlsWithPendingChanges.length})</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Minhas Propostas de Novos Controles Pendentes</CardTitle>
              <CardDescription>Acompanhe os novos controles que você solicitou e aguardam aprovação.</CardDescription>
            </CardHeader>
            <CardContent>
              {ownerPendingNewControlRequests.length > 0 ? (
                <ul className="space-y-2">
                  {ownerPendingNewControlRequests.slice(0, 3).map(request => (
                    <li key={request.id} className="flex justify-between items-center p-3 border rounded-md hover:bg-muted/30">
                      <div>
                        <Link href={`/change-requests/${request.id}`} className="text-primary hover:underline font-medium">
                         Proposta: {request.changes.controlId || 'ID Pendente'} - {request.changes.controlName}
                        </Link>
                        <p className="text-xs text-muted-foreground">Solicitado em: {new Date(request.requestDate).toLocaleDateString('pt-BR')} (Status: {request.status})</p>
                      </div>
                       <Button variant="outline" size="sm" asChild>
                        <Link href={`/change-requests/${request.id}`}>Ver Proposta <ExternalLink className="ml-2 h-3 w-3"/></Link>
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">Você não tem propostas de novos controles pendentes.</p>
              )}
              {ownerPendingNewControlRequests.length > 0 && ( 
                <div className="mt-4 text-right">
                  <Button variant="link" asChild>
                     {/* Link para a aba correta na página de solicitações */}
                    <Link href="/pending-approvals">Ver todas as propostas ({ownerPendingNewControlRequests.length})</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros e Tabela para Admin */}
      {isUserAdmin() && (
        <>
          <Card className="shadow-md">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-primary" />
                <CardTitle className="text-xl">Filtrar Controles Ativos</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="md:col-span-1">
                  <label htmlFor="searchControl" className="text-sm font-medium text-muted-foreground">Pesquisar Controle</label>
                  <div className="relative">
                    <Input 
                        id="searchControl" 
                        placeholder="Código, Nome, Descrição..." 
                        className="pr-10" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>
                <div>
                  <label htmlFor="processo" className="text-sm font-medium text-muted-foreground">Processo</label>
                  <Select value={selectedProcess} onValueChange={setSelectedProcess}>
                    <SelectTrigger id="processo"><SelectValue placeholder="Selecionar Processo" /></SelectTrigger>
                    <SelectContent>
                      {mockProcessos.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label htmlFor="subprocesso" className="text-sm font-medium text-muted-foreground">Subprocesso</label>
                  <Select value={selectedSubProcess} onValueChange={setSelectedSubProcess}>
                    <SelectTrigger id="subprocesso"><SelectValue placeholder="Selecionar Subprocesso" /></SelectTrigger>
                    <SelectContent>
                      {mockSubProcessos.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label htmlFor="dono" className="text-sm font-medium text-muted-foreground">Dono do Controle</label>
                  <Select value={selectedOwner} onValueChange={setSelectedOwner}>
                    <SelectTrigger id="dono"><SelectValue placeholder="Selecionar Dono" /></SelectTrigger>
                    <SelectContent>
                      {mockDonos.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={handleResetFilters}>
                  <RotateCcw className="mr-2 h-4 w-4" /> Limpar Filtros
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Matriz de Controles Internos (Ativos)</CardTitle>
              <CardDescription>
                Visualize todos os controles SOX ativos. Clique em um ID de controle para mais detalhes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Processo</TableHead>
                      <TableHead>Subprocesso</TableHead>
                      <TableHead className="w-[100px]">Código</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Frequência</TableHead>
                      <TableHead>Modalidade</TableHead>
                      <TableHead>P/D</TableHead>
                      <TableHead>Dono</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAdminControls.map((control) => (
                      <TableRow key={control.id}>
                        <TableCell>{control.processo}</TableCell>
                        <TableCell>{control.subProcesso}</TableCell>
                        <TableCell className="font-medium">
                          <Link href={`/controls/${control.id}`} className="text-primary hover:underline">
                            {control.controlId}
                          </Link>
                        </TableCell>
                        <TableCell>{control.controlName}</TableCell>
                        <TableCell>{control.controlFrequency}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            control.modalidade === "Manual" ? "bg-purple-100 text-purple-700" :
                            control.modalidade === "Automático" ? "bg-blue-100 text-blue-700" :
                            control.modalidade === "Híbrido" ? "bg-teal-100 text-teal-700" :
                            "bg-gray-100 text-gray-700"
                          }`}>
                            {control.modalidade}
                          </span>
                        </TableCell>
                        <TableCell>{control.controlType}</TableCell>
                        <TableCell>{control.controlOwner}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-1">
                            <Button variant="ghost" size="icon" asChild title="Ver Detalhes">
                              <Link href={`/controls/${control.id}`}><Eye className="h-4 w-4" /></Link>
                            </Button>
                            <Button variant="ghost" size="icon" asChild title="Solicitar Alteração / Editar">
                              <Link href={`/controls/${control.id}?edit=true`}><FileEdit className="h-4 w-4" /></Link>
                            </Button>
                            <Button variant="ghost" size="icon" asChild title="Navegar">
                              <Link href={`/controls/${control.id}`}><ChevronRight className="h-4 w-4" /></Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {filteredAdminControls.length === 0 && (
                <p className="mt-4 text-center text-muted-foreground">
                  Nenhum controle ativo encontrado com os filtros aplicados.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
