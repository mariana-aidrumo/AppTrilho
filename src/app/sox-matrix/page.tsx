
// src/app/sox-matrix/page.tsx
'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SoxControl, ChangeRequest } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, FileEdit, History, ChevronRight, Filter, RotateCcw, Search, CheckSquare, FilePlus2, ListChecks, ExternalLink, TrendingUp, Users, AlertCircle, LayoutDashboard, Layers } from "lucide-react";
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

  // Dados para Admin e Dono (para a tabela principal de todos os controles)
  const allActiveControls = useMemo(() => {
    return mockSoxControls.filter(control => {
      const matchesSearch = searchTerm === "" ||
        control.controlId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        control.controlName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        control.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesProcess = selectedProcess === "Todos" || control.processo === selectedProcess;
      const matchesSubProcess = selectedSubProcess === "Todos" || control.subProcesso === selectedSubProcess;
      const matchesOwner = selectedOwner === "Todos" || control.controlOwner === selectedOwner;
      const isActive = control.status === "Ativo"; 

      return isActive && matchesSearch && matchesProcess && matchesSubProcess && matchesOwner;
    });
  }, [mockSoxControls, searchTerm, selectedProcess, selectedSubProcess, selectedOwner]);

  // Dados específicos para Admin (KPIs)
  const adminTotalActiveControls = useMemo(() => mockSoxControls.filter(c => c.status === "Ativo").length, [mockSoxControls]);
  const adminTotalOwners = useMemo(() => (mockDonos.filter(d => d !== "Todos").length) , [mockDonos]); 
  const adminTotalPendingRequests = useMemo(() => mockChangeRequests.filter(req => req.status === "Pendente" || req.status === "Em Análise" || req.status === "Aguardando Feedback do Dono").length, [mockChangeRequests]);


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
          <div className="grid grid-cols-1 gap-6 mb-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"> 
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
          </div>
        )}

      {/* Visão Geral para Dono do Controle */}
      {isUserControlOwner() && (
        <div className="space-y-6">
            <CardHeader className="px-0">
                <CardTitle className="text-2xl">Painel (Visão Geral)</CardTitle>
                <CardDescription>Acompanhe os controles e suas solicitações.</CardDescription>
            </CardHeader>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Card className="shadow-md hover:shadow-lg transition-shadow">
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
                <Card className="shadow-md hover:shadow-lg transition-shadow">
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
             {/* Seção de Todos os Controles Ativos para Dono do Controle */}
             <Card className="shadow-md col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-4 mt-6">
                <CardHeader>
                    <CardTitle>Visão Geral dos Controles SOX Ativos</CardTitle>
                    <CardDescription>
                        Explore todos os controles SOX atualmente ativos na organização.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                   {/* Filtros são reaproveitados aqui para consistência, mas poderiam ser diferentes se necessário */}
                    <div className="mb-6 space-y-4">
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
                    </div>

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
                            {allActiveControls.map((control) => (
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
                                    {/* Dono do controle não pode editar diretamente daqui, apenas ver. */}
                                    {/* Admins podem ter um botão de editar aqui se desejado, vindo da lógica da tabela de admin */}
                                </div>
                                </TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                        </Table>
                    </div>
                    {allActiveControls.length === 0 && (
                        <p className="mt-4 text-center text-muted-foreground">
                        Nenhum controle ativo encontrado com os filtros aplicados.
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
      )}

      {/* Filtros e Tabela para Admin - Mantido como antes, mas agora usa allActiveControls */}
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
                  <label htmlFor="searchControlAdmin" className="text-sm font-medium text-muted-foreground">Pesquisar Controle</label>
                  <div className="relative">
                    <Input 
                        id="searchControlAdmin" 
                        placeholder="Código, Nome, Descrição..." 
                        className="pr-10" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>
                <div>
                  <label htmlFor="processoAdmin" className="text-sm font-medium text-muted-foreground">Processo</label>
                  <Select value={selectedProcess} onValueChange={setSelectedProcess}>
                    <SelectTrigger id="processoAdmin"><SelectValue placeholder="Selecionar Processo" /></SelectTrigger>
                    <SelectContent>
                      {mockProcessos.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label htmlFor="subprocessoAdmin" className="text-sm font-medium text-muted-foreground">Subprocesso</label>
                  <Select value={selectedSubProcess} onValueChange={setSelectedSubProcess}>
                    <SelectTrigger id="subprocessoAdmin"><SelectValue placeholder="Selecionar Subprocesso" /></SelectTrigger>
                    <SelectContent>
                      {mockSubProcessos.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label htmlFor="donoAdmin" className="text-sm font-medium text-muted-foreground">Dono do Controle</label>
                  <Select value={selectedOwner} onValueChange={setSelectedOwner}>
                    <SelectTrigger id="donoAdmin"><SelectValue placeholder="Selecionar Dono" /></SelectTrigger>
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
                    {allActiveControls.map((control) => (
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
              {allActiveControls.length === 0 && (
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

