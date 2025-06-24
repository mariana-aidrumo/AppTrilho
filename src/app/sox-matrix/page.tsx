
// src/app/sox-matrix/page.tsx
'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SoxControl, ChangeRequest } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, FileEdit, ChevronRight, Filter, RotateCcw, Search, CheckSquare, ListChecks, ExternalLink, TrendingUp, Users, AlertCircle, LayoutDashboard, Layers, Download } from "lucide-react";
import Link from "next/link";
import { useUserProfile } from "@/contexts/user-profile-context";
import { mockSoxControls, mockProcessos, mockSubProcessos, mockDonos, mockChangeRequests, mockResponsaveis, mockN3Responsaveis } from "@/data/mock-data";
import { useState, useMemo } from "react";

type UnifiedTableItemType = 'Controle Ativo' | 'Solicitação de Alteração' | 'Proposta de Novo Controle';

interface UnifiedTableItem {
  key: string;
  originalId: string;
  itemType: UnifiedTableItemType;
  previousDisplayId?: string; // Cód Controle ANTERIOR
  displayId: string; // Código NOVO
  name: string;
  description?: string;
  processo?: string;
  subProcesso?: string;
  ownerOrRequester: string;
  status: string;
  responsavel?: string;
  n3Responsavel?: string;
  controlFrequency?: string;
  controlType?: string;
  modalidade?: string;
  requestDate?: string;
  lastUpdated?: string;
  requestedBy?: string;
  summaryOfChanges?: string;
  comments?: string;
  adminFeedback?: string;
  relatedRisks?: string[];
  testProcedures?: string;
}


export default function SoxMatrixPage() {
  const { currentUser } = useUserProfile();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProcess, setSelectedProcess] = useState("Todos");
  const [selectedSubProcess, setSelectedSubProcess] = useState("Todos");
  const [selectedOwner, setSelectedOwner] = useState("Todos");
  const [selectedResponsavel, setSelectedResponsavel] = useState("Todos");
  const [selectedN3Responsavel, setSelectedN3Responsavel] = useState("Todos");

  const unifiedTableData = useMemo(() => {
    const items: UnifiedTableItem[] = [];

    mockSoxControls
      .filter(control => control.status === "Ativo")
      .forEach(control => {
        items.push({
          key: `control-${control.id}`,
          originalId: control.id,
          itemType: 'Controle Ativo',
          previousDisplayId: "N/A", // Não há código anterior para um controle ativo
          displayId: control.controlId, // Código Novo é o código atual
          name: control.controlName,
          description: control.description,
          processo: control.processo,
          subProcesso: control.subProcesso,
          ownerOrRequester: control.controlOwner,
          status: control.status,
          responsavel: control.responsavel,
          n3Responsavel: control.n3Responsavel,
          controlFrequency: control.controlFrequency,
          controlType: control.controlType,
          modalidade: control.modalidade,
          lastUpdated: control.lastUpdated,
          relatedRisks: control.relatedRisks,
          testProcedures: control.testProcedures,
        });
      });

    mockChangeRequests
      .filter(req => req.status === "Pendente" || req.status === "Em Análise" || req.status === "Aguardando Feedback do Dono")
      .forEach(req => {
        const isNewControl = req.controlId.startsWith("NEW-CTRL-");
        const controlDetails = !isNewControl ? mockSoxControls.find(c => c.controlId === req.controlId) : undefined;
        
        let name: string;
        let previousDisplayId: string | undefined;
        let displayId: string;
        let processo = req.changes.processo || controlDetails?.processo;
        let subProcesso = req.changes.subProcesso || controlDetails?.subProcesso;
        let responsavel = req.changes.responsavel || controlDetails?.responsavel;
        let n3Responsavel = req.changes.n3Responsavel || controlDetails?.n3Responsavel;

        if (isNewControl) {
          name = req.changes.controlName || "Nova Proposta Sem Nome";
          previousDisplayId = "N/A";
          displayId = req.changes.controlId || "(ID a ser definido)";
        } else if (controlDetails) {
          name = controlDetails.controlName;
          previousDisplayId = controlDetails.controlId;
          displayId = req.changes.controlId || controlDetails.controlId; // Mostra o novo ID se proposto, senão o antigo
        } else {
          return; // Skip if control details not found for an alteration
        }
        
        const summaryOfChanges = Object.entries(req.changes)
          .map(([key, value]) => `${key}: ${value}`)
          .join('; ');

        items.push({
          key: `request-${req.id}`,
          originalId: req.id,
          itemType: isNewControl ? 'Proposta de Novo Controle' : 'Solicitação de Alteração',
          previousDisplayId: previousDisplayId,
          displayId: displayId,
          name: name,
          description: req.changes.description || controlDetails?.description || req.changes.justificativa || '',
          processo: processo,
          subProcesso: subProcesso,
          ownerOrRequester: req.requestedBy,
          status: req.status,
          responsavel: responsavel,
          n3Responsavel: n3Responsavel,
          requestDate: req.requestDate,
          requestedBy: req.requestedBy,
          summaryOfChanges: summaryOfChanges,
          comments: req.comments,
          adminFeedback: req.adminFeedback,
          controlFrequency: req.changes.controlFrequency || controlDetails?.controlFrequency,
          controlType: req.changes.controlType || controlDetails?.controlType,
          modalidade: req.changes.modalidade || controlDetails?.modalidade,
          relatedRisks: req.changes.relatedRisks || controlDetails?.relatedRisks,
          testProcedures: req.changes.testProcedures || controlDetails?.testProcedures,
        });
      });
    
    return items.filter(item => {
      const lowerSearchTerm = searchTerm.toLowerCase();
      const matchesSearch = searchTerm === "" ||
        item.displayId.toLowerCase().includes(lowerSearchTerm) ||
        (item.previousDisplayId || '').toLowerCase().includes(lowerSearchTerm) ||
        item.name.toLowerCase().includes(lowerSearchTerm) ||
        (item.itemType !== 'Controle Ativo' && item.summaryOfChanges?.toLowerCase().includes(lowerSearchTerm));

      const matchesProcess = selectedProcess === "Todos" || (item.processo || "").includes(selectedProcess);
      const matchesSubProcess = selectedSubProcess === "Todos" || (item.subProcesso || "").includes(selectedSubProcess);
      const matchesOwner = selectedOwner === "Todos" || item.ownerOrRequester === selectedOwner || (item.itemType === 'Controle Ativo' && item.ownerOrRequester === selectedOwner);
      
      const matchesResponsavelFilter = selectedResponsavel === "Todos" || item.responsavel === selectedResponsavel;
      const matchesN3ResponsavelFilter = selectedN3Responsavel === "Todos" || item.n3Responsavel === selectedN3Responsavel;

      return matchesSearch && matchesProcess && matchesSubProcess && matchesOwner && matchesResponsavelFilter && matchesN3ResponsavelFilter;
    });

  }, [mockSoxControls, mockChangeRequests, searchTerm, selectedProcess, selectedSubProcess, selectedOwner, selectedResponsavel, selectedN3Responsavel]);


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

  const escapeCsvCell = (cellData: any): string => {
    if (cellData === null || cellData === undefined) {
      return "";
    }
    const stringData = String(cellData);
    if (stringData.includes(',') || stringData.includes('\n') || stringData.includes('"')) {
      return `"${stringData.replace(/"/g, '""')}"`;
    }
    return stringData;
  };

  const handleExtractCsv = () => {
    const headers = [
      "Cód Controle ANTERIOR",
      "Processo", "Sub-Processo", "Código NOVO", "Nome do Controle", 
      "Descrição do controle ATUAL", "Frequência", "Modalidade", "P/D", 
      "Dono do Controle (Control owner)"
    ];

    const rows = unifiedTableData.map(item => [
      escapeCsvCell(item.previousDisplayId),
      escapeCsvCell(item.processo),
      escapeCsvCell(item.subProcesso),
      escapeCsvCell(item.displayId),
      escapeCsvCell(item.name),
      escapeCsvCell(item.description),
      escapeCsvCell(item.controlFrequency),
      escapeCsvCell(item.modalidade),
      escapeCsvCell(item.controlType),
      escapeCsvCell(item.ownerOrRequester),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "matriz_geral_controles.csv");
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };


  const renderUnifiedTable = (items: UnifiedTableItem[]) => (
     <div className="rounded-md border mt-4 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cód Controle ANTERIOR</TableHead>
            <TableHead>Processo</TableHead>
            <TableHead>Sub-Processo</TableHead>
            <TableHead>Código NOVO</TableHead>
            <TableHead>Nome do Controle</TableHead>
            <TableHead>Descrição do controle ATUAL</TableHead>
            <TableHead>Frequência</TableHead>
            <TableHead>Modalidade</TableHead>
            <TableHead>P/D</TableHead>
            <TableHead>Dono do Controle (Control owner)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.key}>
              <TableCell>{item.previousDisplayId || "N/A"}</TableCell>
              <TableCell>{item.processo || "N/A"}</TableCell>
              <TableCell>{item.subProcesso || "N/A"}</TableCell>
              <TableCell className="font-medium">{item.displayId}</TableCell>
              <TableCell className="max-w-xs truncate" title={item.name}>{item.name}</TableCell>
              <TableCell className="max-w-sm truncate" title={item.description}>{item.description || "N/A"}</TableCell>
              <TableCell>{item.controlFrequency || "N/A"}</TableCell>
              <TableCell>{item.modalidade || "N/A"}</TableCell>
              <TableCell>{item.controlType || "N/A"}</TableCell>
              <TableCell>{item.ownerOrRequester}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
       {items.length === 0 && (
        <p className="mt-4 mb-4 text-center text-muted-foreground">
          Nenhum item encontrado com os filtros aplicados.
        </p>
      )}
    </div>
  );

  const renderFilters = () => (
    <div className="mb-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-end">
        <div className="md:col-span-2 lg:col-span-2 xl:col-span-2">
          <label htmlFor="searchControl" className="text-sm font-medium text-muted-foreground">Pesquisar</label>
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
          <label htmlFor="dono" className="text-sm font-medium text-muted-foreground">Dono/Solicitante</label>
          <Select value={selectedOwner} onValueChange={setSelectedOwner}>
            <SelectTrigger id="dono"><SelectValue placeholder="Selecionar Dono/Solicitante" /></SelectTrigger>
            <SelectContent>
               {[...new Set([...mockDonos, ...mockChangeRequests.map(cr => cr.requestedBy)])].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
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
        <Button variant="default" onClick={handleExtractCsv} disabled={unifiedTableData.length === 0}>
          <Download className="mr-2 h-4 w-4" /> Extrair CSV
        </Button>
      </div>
    </div>
  );


  return (
    <div className="space-y-6 w-full">
      {currentUser.activeProfile === "Administrador de Controles Internos" && (
          <>
            <div className="grid grid-cols-1 gap-6 mb-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
              <Card className="shadow-md hover:shadow-lg transition-shadow w-full">
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
              <Card className="shadow-md w-full">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base font-medium">Controles Ativos</CardTitle>
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{adminTotalActiveControls}</div>
                  <p className="text-xs text-muted-foreground">Total de controles atualmente ativos</p>
                </CardContent>
              </Card>
              <Card className="shadow-md w-full">
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
                  <CardTitle className="text-xl">Filtrar Matriz Geral</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {renderFilters()}
              </CardContent>
            </Card>

            <Card className="shadow-md w-full">
              <CardHeader>
                <CardTitle>Matriz Geral de Controles e Solicitações</CardTitle>
                <CardDescription>
                  Visualize controles ativos e solicitações pendentes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderUnifiedTable(unifiedTableData)}
              </CardContent>
            </Card>
          </>
        )}

      {currentUser.activeProfile === "Dono do Controle" && (
        <div className="space-y-6 w-full">
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
                    <CardTitle>Visão Geral dos Controles Ativos</CardTitle>
                    <CardDescription>
                        Explore todos os controles internos atualmente ativos na organização.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                   {renderFilters()}
                   {renderUnifiedTable(unifiedTableData.filter(item => item.itemType === 'Controle Ativo'))}
                </CardContent>
            </Card>
        </div>
      )}
    </div>
  );
}
