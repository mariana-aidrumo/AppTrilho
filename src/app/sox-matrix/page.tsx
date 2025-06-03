
// src/app/sox-matrix/page.tsx
'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SoxControl } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, FileEdit, ChevronRight, Filter, RotateCcw, Search, CheckSquare, ListChecks, ExternalLink, TrendingUp, Users, AlertCircle, LayoutDashboard, Layers } from "lucide-react";
import Link from "next/link";
import { useUserProfile } from "@/contexts/user-profile-context";
import { mockSoxControls, mockProcessos, mockSubProcessos, mockDonos, mockChangeRequests, mockResponsaveis, mockN3Responsaveis } from "@/data/mock-data";
import { useState, useMemo } from "react";

export default function SoxMatrixPage() {
  const { currentUser, isUserAdmin, isUserControlOwner } = useUserProfile();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProcess, setSelectedProcess] = useState("Todos");
  const [selectedSubProcess, setSelectedSubProcess] = useState("Todos");
  const [selectedOwner, setSelectedOwner] = useState("Todos");
  const [selectedResponsavel, setSelectedResponsavel] = useState("Todos");
  const [selectedN3Responsavel, setSelectedN3Responsavel] = useState("Todos");

  const allActiveControls = useMemo(() => {
    return mockSoxControls.filter(control => {
      const matchesSearch = searchTerm === "" ||
        control.controlId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        control.controlName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        control.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesProcess = selectedProcess === "Todos" || control.processo === selectedProcess;
      const matchesSubProcess = selectedSubProcess === "Todos" || control.subProcesso === selectedSubProcess;
      const matchesOwner = selectedOwner === "Todos" || control.controlOwner === selectedOwner;
      const matchesResponsavel = selectedResponsavel === "Todos" || control.responsavel === selectedResponsavel;
      const matchesN3Responsavel = selectedN3Responsavel === "Todos" || control.n3Responsavel === selectedN3Responsavel;
      const isActive = control.status === "Ativo";

      return isActive && matchesSearch && matchesProcess && matchesSubProcess && matchesOwner && matchesResponsavel && matchesN3Responsavel;
    });
  }, [mockSoxControls, searchTerm, selectedProcess, selectedSubProcess, selectedOwner, selectedResponsavel, selectedN3Responsavel]);

  const adminTotalActiveControls = useMemo(() => mockSoxControls.filter(c => c.status === "Ativo").length, [mockSoxControls]);
  const adminTotalOwners = useMemo(() => (mockDonos.filter(d => d !== "Todos").length) , [mockDonos]);
  const adminTotalPendingRequests = useMemo(() => mockChangeRequests.filter(req => req.status === "Pendente" || req.status === "Em Análise" || req.status === "Aguardando Feedback do Dono").length, [mockChangeRequests]);

  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedProcess("Todos");
    setSelectedSubProcess("Todos");
    setSelectedOwner("Todos");
    setSelectedResponsavel("Todos");
    setSelectedN3Responsavel("Todos");
  };

  const renderControlsTable = (controls: SoxControl[], profileContext: "admin" | "owner") => (
     <div className="rounded-md border mt-4 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Processo</TableHead>
            <TableHead>Subprocesso</TableHead>
            <TableHead className="w-[100px]">Código</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Dono</TableHead>
            <TableHead>Responsável</TableHead>
            <TableHead>N3 Responsável</TableHead>
            <TableHead>Frequência</TableHead>
            <TableHead>Modalidade</TableHead>
            <TableHead>P/D</TableHead>
            <TableHead className="text-right min-w-[100px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {controls.map((control) => (
            <TableRow key={control.id}>
              <TableCell>{control.processo}</TableCell>
              <TableCell>{control.subProcesso}</TableCell>
              <TableCell className="font-medium">
                <Link href={`/controls/${control.id}`} className="text-primary hover:underline">
                  {control.controlId}
                </Link>
              </TableCell>
              <TableCell>{control.controlName}</TableCell>
              <TableCell>{control.controlOwner}</TableCell>
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
                <div className="flex justify-end space-x-1">
                  <Button variant="ghost" size="icon" asChild title="Ver Detalhes">
                    <Link href={`/controls/${control.id}`}><Eye className="h-4 w-4" /></Link>
                  </Button>
                  {profileContext === "admin" && (
                    <>
                      <Button variant="ghost" size="icon" asChild title="Editar Controle">
                        <Link href={`/controls/${control.id}?edit=true`}><FileEdit className="h-4 w-4" /></Link>
                      </Button>
                      <Button variant="ghost" size="icon" asChild title="Navegar">
                        <Link href={`/controls/${control.id}`}><ChevronRight className="h-4 w-4" /></Link>
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
       {controls.length === 0 && (
        <p className="mt-4 mb-4 text-center text-muted-foreground">
          Nenhum controle ativo encontrado com os filtros aplicados.
        </p>
      )}
    </div>
  );

  const renderFilters = () => (
    <div className="mb-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-end">
        <div className="md:col-span-2 lg:col-span-2 xl:col-span-2">
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
          <label htmlFor="dono" className="text-sm font-medium text-muted-foreground">Dono</label>
          <Select value={selectedOwner} onValueChange={setSelectedOwner}>
            <SelectTrigger id="dono"><SelectValue placeholder="Selecionar Dono" /></SelectTrigger>
            <SelectContent>
              {mockDonos.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label htmlFor="responsavel" className="text-sm font-medium text-muted-foreground">Responsável</label>
          <Select value={selectedResponsavel} onValueChange={setSelectedResponsavel}>
            <SelectTrigger id="responsavel"><SelectValue placeholder="Selecionar Responsável" /></SelectTrigger>
            <SelectContent>
              {mockResponsaveis.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-1 lg:col-start-1 xl:col-start-auto">
          <label htmlFor="n3Responsavel" className="text-sm font-medium text-muted-foreground">N3 Responsável</label>
          <Select value={selectedN3Responsavel} onValueChange={setSelectedN3Responsavel}>
            <SelectTrigger id="n3Responsavel"><SelectValue placeholder="Selecionar N3" /></SelectTrigger>
            <SelectContent>
              {mockN3Responsaveis.map(n3 => <SelectItem key={n3} value={n3}>{n3}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={handleResetFilters}>
          <RotateCcw className="mr-2 h-4 w-4" /> Limpar Filtros
        </Button>
      </div>
    </div>
  );


  return (
    <div className="space-y-6">
      {isUserAdmin() && (
          <>
            <div className="grid grid-cols-1 gap-6 mb-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
              <Card className="shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base font-medium">Aprovações Pendentes</CardTitle>
                  <Link href="/pending-approvals"><CheckSquare className="h-5 w-5 text-primary cursor-pointer" /></Link>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{adminTotalPendingRequests}</div>
                  <p className="text-xs text-muted-foreground">
                    Total de solicitações aguardando ação.
                  </p>
                </CardContent>
              </Card>
              <Card className="shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base font-medium">Controles Ativos</CardTitle>
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{adminTotalActiveControls}</div>
                  <p className="text-xs text-muted-foreground">Total de controles atualmente ativos</p>
                </CardContent>
              </Card>
              <Card className="shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base font-medium">Donos de Controles</CardTitle>
                  <Users className="h-5 w-5 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{adminTotalOwners}</div>
                  <p className="text-xs text-muted-foreground">Total de donos de controles únicos</p>
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-md w-full">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-primary" />
                  <CardTitle className="text-xl">Filtrar Controles Ativos</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {renderFilters()}
              </CardContent>
            </Card>

            <Card className="shadow-md w-full">
              <CardHeader>
                <CardTitle>Matriz de Controles Internos (Ativos)</CardTitle>
                <CardDescription>
                  Visualize todos os controles SOX ativos. Clique em um ID de controle para mais detalhes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderControlsTable(allActiveControls, "admin")}
              </CardContent>
            </Card>
          </>
        )}

      {isUserControlOwner() && (
        <div className="space-y-6">
            <CardHeader className="px-0">
                <CardTitle className="text-2xl">Painel (Visão Geral)</CardTitle>
                <CardDescription>Acompanhe os controles e suas solicitações.</CardDescription>
            </CardHeader>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Card className="shadow-md hover:shadow-lg transition-shadow w-full">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-base font-medium">Minhas Solicitações</CardTitle>
                        <Link href="/pending-approvals"><ListChecks className="h-5 w-5 text-primary" /></Link>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">
                            Acompanhe o status das suas propostas e alterações.
                        </p>
                        <Button variant="outline" size="sm" className="mt-3 w-full" asChild>
                            <Link href="/pending-approvals">Ver Minhas Solicitações</Link>
                        </Button>
                    </CardContent>
                </Card>
                <Card className="shadow-md hover:shadow-lg transition-shadow w-full">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-base font-medium">Meus Controles</CardTitle>
                         <Link href="/my-registered-controls"><Layers className="h-5 w-5 text-primary" /></Link>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">
                            Acesse e gerencie seus controles e solicitações.
                        </p>
                         <Button variant="outline" size="sm" className="mt-3 w-full" asChild>
                            <Link href="/my-registered-controls">Acessar Meus Controles</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
             <Card className="shadow-md col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-4 mt-6 w-full">
                <CardHeader>
                    <CardTitle>Visão Geral dos Controles SOX Ativos (Transparência)</CardTitle>
                    <CardDescription>
                        Explore todos os controles SOX atualmente ativos na organização. Você pode visualizar detalhes, mas a edição é restrita aos seus próprios controles ou via solicitação.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                   {renderFilters()}
                   {renderControlsTable(allActiveControls, "owner")}
                </CardContent>
            </Card>
        </div>
      )}
    </div>
  );
}

