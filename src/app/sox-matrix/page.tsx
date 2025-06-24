
// src/app/sox-matrix/page.tsx
'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SoxControl, ChangeRequest, IPEAssertions } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Eye, Filter, RotateCcw, Search, CheckSquare, TrendingUp, Users, LayoutDashboard, Layers, Download, ListChecks, Loader2 } from "lucide-react";
import Link from "next/link";
import { useUserProfile } from "@/contexts/user-profile-context";
import { useState, useMemo, useEffect } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import * as xlsx from 'xlsx';
import { getSoxControls, getChangeRequests, getFilterOptions } from "@/services/sox-service";

type UnifiedTableItemType = 'Controle Ativo' | 'Solicitação de Alteração' | 'Proposta de Novo Controle';

// This interface combines fields from SoxControl and ChangeRequest for the unified table.
interface UnifiedTableItem extends Partial<SoxControl> {
  key: string;
  originalId: string;
  itemType: UnifiedTableItemType;
  
  // Display fields for the table
  previousDisplayId?: string;
  displayId: string;
  name: string; // From controlName
  ownerOrRequester: string; // From controlOwner or requestedBy
  
  // Request-specific fields
  requestDate?: string;
  summaryOfChanges?: string;
  comments?: string;
  adminFeedback?: string;
}

const ControlDetailSheet = ({ item, open, onOpenChange }: { item: UnifiedTableItem | null; open: boolean; onOpenChange: (open: boolean) => void; }) => {
  if (!item) return null;

  const DetailRow = ({ label, value }: { label: string; value?: ReactNode | null }) => (
    <div className="grid grid-cols-12 gap-2 py-2 border-b text-sm">
      <dt className="col-span-4 font-semibold text-muted-foreground">{label}</dt>
      <dd className="col-span-8">{value || <span className="text-muted-foreground/70">N/A</span>}</dd>
    </div>
  );

  const SectionHeader = ({ title }: { title: string }) => (
      <h3 className="text-base font-semibold text-primary bg-primary/10 p-2 my-4 rounded-md">{title}</h3>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{item.name}</SheetTitle>
          <SheetDescription>Detalhes completos do controle e suas responsabilidades.</SheetDescription>
        </SheetHeader>
        <div className="py-4">
            <SectionHeader title="Histórico (De-Para)" />
            <dl><DetailRow label="Cód Controle ANTERIOR" value={item.codigoAnterior} /></dl>

            <SectionHeader title="Informações Gerais" />
            <dl>
                <DetailRow label="Matriz" value={item.matriz} />
                <DetailRow label="Processo" value={item.processo} />
                <DetailRow label="Sub-Processo" value={item.subProcesso} />
                <DetailRow label="Risco" value={item.riscoId} />
                <DetailRow label="Descrição do Risco" value={item.riscoDescricao} />
                <DetailRow label="Classificação do Risco" value={item.riscoClassificacao} />
            </dl>

            <SectionHeader title="Informações do Controle" />
            <dl>
                <DetailRow label="Código NOVO" value={item.displayId} />
                <DetailRow label="Código COSAN" value={item.codigoCosan} />
                <DetailRow label="Objetivo do Controle" value={item.objetivoControle} />
                <DetailRow label="Nome do Controle" value={item.name} />
                <DetailRow label="Descrição do controle ATUAL" value={<div className="whitespace-pre-wrap">{item.description}</div>} />
                <DetailRow label="Tipo" value={item.tipo} />
                <DetailRow label="Frequência" value={item.controlFrequency} />
                <DetailRow label="Modalidade" value={item.modalidade} />
                <DetailRow label="P/D" value={item.controlType} />
                <DetailRow label="MRC?" value={item.mrc === false ? 'Não' : item.mrc === true ? 'Sim' : 'N/A'} />
                <DetailRow label="Evidência do controle" value={<div className="whitespace-pre-wrap">{item.evidenciaControle}</div>} />
                <DetailRow label="Implementação Data" value={item.implementacaoData} />
                <DetailRow label="Data última alteração" value={item.dataUltimaAlteracao} />
                <DetailRow label="Sistemas Relacionados" value={item.sistemasRelacionados?.join(', ')} />
                <DetailRow label="Transações/Telas/Menus críticos" value={item.transacoesTelasMenusCriticos} />
                <DetailRow label="Aplicável IPE?" value={item.aplicavelIPE === false ? 'Não' : item.aplicavelIPE === true ? 'Sim' : 'N/A'} />
                <DetailRow label="C" value={item.ipeAssertions?.C ? 'X' : ''} />
                <DetailRow label="E/O" value={item.ipeAssertions?.EO ? 'X' : ''} />
                <DetailRow label="V/A" value={item.ipeAssertions?.VA ? 'X' : ''} />
                <DetailRow label="O/R" value={item.ipeAssertions?.OR ? 'X' : ''} />
                <DetailRow label="P/D (IPE)" value={item.ipeAssertions?.PD ? 'X' : ''} />
            </dl>
            
            <SectionHeader title="Responsabilidades" />
            <dl>
                <DetailRow label="Responsável" value={item.responsavel} />
                <DetailRow label="Dono do Controle (Control owner)" value={item.controlOwner} />
                <DetailRow label="Executor do Controle" value={item.executorControle?.join('; ')} />
                <DetailRow label="Executado por" value={item.executadoPor} />
                <DetailRow label="N3 Responsável" value={item.n3Responsavel} />
                <DetailRow label="Área" value={item.area} />
                <DetailRow label="VP Responsável" value={item.vpResponsavel} />
            </dl>

            <SectionHeader title="Malha Sul" />
            <dl><DetailRow label="Impacto Malha Sul" value={item.impactoMalhaSul === false ? 'Não' : item.impactoMalhaSul === true ? 'Sim' : 'N/A'} /></dl>

            <SectionHeader title="Sistema" />
            <dl><DetailRow label="Sistema Armazenamento" value={item.sistemaArmazenamento} /></dl>
        </div>
      </SheetContent>
    </Sheet>
  );
};


export default function SoxMatrixPage() {
  const { currentUser } = useUserProfile();
  const [isLoading, setIsLoading] = useState(true);

  // Data states
  const [soxControls, setSoxControls] = useState<SoxControl[]>([]);
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [processos, setProcessos] = useState<string[]>([]);
  const [subProcessos, setSubProcessos] = useState<string[]>([]);
  const [donos, setDonos] = useState<string[]>([]);
  const [responsaveis, setResponsaveis] = useState<string[]>([]);
  const [n3Responsaveis, setN3Responsaveis] = useState<string[]>([]);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProcess, setSelectedProcess] = useState("Todos");
  const [selectedSubProcess, setSelectedSubProcess] = useState("Todos");
  const [selectedOwner, setSelectedOwner] = useState("Todos");
  const [selectedResponsavel, setSelectedResponsavel] = useState("Todos");
  const [selectedN3Responsavel, setSelectedN3Responsavel] = useState("Todos");
  const [selectedItem, setSelectedItem] = useState<UnifiedTableItem | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [controlsData, requestsData, filtersData] = await Promise.all([
          getSoxControls(),
          getChangeRequests(),
          getFilterOptions()
        ]);
        setSoxControls(controlsData);
        setChangeRequests(requestsData);
        setProcessos(filtersData.processos);
        setSubProcessos(filtersData.subProcessos);
        setDonos(filtersData.donos);
        setResponsaveis(filtersData.responsaveis);
        setN3Responsaveis(filtersData.n3Responsaveis);
      } catch (error) {
        console.error("Failed to load SOX Matrix data:", error);
        // Optionally, show a toast notification for the error
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const unifiedTableData = useMemo(() => {
    const items: UnifiedTableItem[] = [];

    // Add active controls
    soxControls
      .filter(control => control.status === "Ativo")
      .forEach(control => {
        items.push({
          ...control,
          key: `control-${control.id}`,
          originalId: control.id,
          itemType: 'Controle Ativo',
          previousDisplayId: control.codigoAnterior || "N/A",
          displayId: control.controlId,
          name: control.controlName,
          ownerOrRequester: control.controlOwner,
        });
      });

    // Add pending change requests
    changeRequests
      .filter(req => req.status === "Pendente" || req.status === "Em Análise" || req.status === "Aguardando Feedback do Dono")
      .forEach(req => {
        const isNewControl = req.controlId.startsWith("NEW-CTRL-");
        const controlDetails = !isNewControl ? soxControls.find(c => c.controlId === req.controlId) : undefined;
        
        let name: string;
        let previousDisplayId: string | undefined;
        let displayId: string;
        
        if (isNewControl) {
          name = req.changes.controlName || "Nova Proposta Sem Nome";
          previousDisplayId = "N/A";
          displayId = req.changes.controlId || "(ID a ser definido)";
        } else if (controlDetails) {
          name = controlDetails.controlName;
          previousDisplayId = controlDetails.controlId;
          displayId = req.changes.controlId || controlDetails.controlId;
        } else {
          return;
        }
        
        const summaryOfChanges = Object.entries(req.changes)
          .map(([key, value]) => `${key}: ${value}`)
          .join('; ');
        
        // Combine original control data with proposed changes
        const combinedData = { ...controlDetails, ...req.changes };

        items.push({
          ...combinedData,
          key: `request-${req.id}`,
          originalId: req.id,
          itemType: isNewControl ? 'Proposta de Novo Controle' : 'Solicitação de Alteração',
          previousDisplayId: previousDisplayId,
          displayId: displayId,
          name: name,
          ownerOrRequester: req.requestedBy,
          requestDate: req.requestDate,
          summaryOfChanges: summaryOfChanges,
          comments: req.comments,
          adminFeedback: req.adminFeedback,
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
      const matchesOwner = selectedOwner === "Todos" || item.ownerOrRequester === selectedOwner || (item.itemType === 'Controle Ativo' && item.controlOwner === selectedOwner);
      
      const matchesResponsavelFilter = selectedResponsavel === "Todos" || item.responsavel === selectedResponsavel;
      const matchesN3ResponsavelFilter = selectedN3Responsavel === "Todos" || item.n3Responsavel === selectedN3Responsavel;

      return matchesSearch && matchesProcess && matchesSubProcess && matchesOwner && matchesResponsavelFilter && matchesN3ResponsavelFilter;
    });

  }, [searchTerm, selectedProcess, selectedSubProcess, selectedOwner, selectedResponsavel, selectedN3Responsavel, soxControls, changeRequests]);


  const adminTotalActiveControls = useMemo(() => soxControls.filter(c => c.status === "Ativo").length, [soxControls]);
  const adminTotalOwners = useMemo(() => new Set(donos.filter(d => d !== "Todos")).size, [donos]);
  const adminTotalPendingRequests = useMemo(() => changeRequests.filter(req => req.status === "Pendente" || req.status === "Em Análise" || req.status === "Aguardando Feedback do Dono").length, [changeRequests]);

  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedProcess("Todos");
    setSelectedSubProcess("Todos");
    setSelectedOwner("Todos");
    setSelectedResponsavel("Todos");
    setSelectedN3Responsavel("Todos");
  };
  
  const handleViewDetails = (item: UnifiedTableItem) => {
    setSelectedItem(item);
  };

  const handleExtractXlsx = () => {
    const dataToExport = unifiedTableData.map(item => ({
      "Cód Controle ANTERIOR": item.previousDisplayId || "",
      "Processo": item.processo || "",
      "Sub-Processo": item.subProcesso || "",
      "Código NOVO": item.displayId || "",
      "Nome do Controle": item.name || "",
      "Descrição do controle ATUAL": item.description || "",
      "Frequência": item.controlFrequency || "",
      "Modalidade": item.modalidade || "",
      "P/D": item.controlType || "",
      "Dono do Controle (Control owner)": item.ownerOrRequester || "",
    }));

    const ws = xlsx.utils.json_to_sheet(dataToExport);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Matriz de Controles");
    xlsx.writeFile(wb, "matriz_geral_controles.xlsx");
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
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow
              key={item.key}
              onClick={() => handleViewDetails(item)}
              className="cursor-pointer"
            >
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
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewDetails(item);
                  }}
                >
                    <Eye className="h-4 w-4" />
                    <span className="sr-only">Ver Detalhes</span>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
       {items.length === 0 && !isLoading && (
        <p className="mt-4 mb-4 text-center text-muted-foreground">
          Nenhum item encontrado com os filtros aplicados.
        </p>
      )}
    </div>
  );

  const renderFilters = () => (
    <div className="space-y-4">
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
              {processos.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label htmlFor="subprocesso" className="text-sm font-medium text-muted-foreground">Subprocesso</label>
          <Select value={selectedSubProcess} onValueChange={setSelectedSubProcess}>
            <SelectTrigger id="subprocesso"><SelectValue placeholder="Selecionar Subprocesso" /></SelectTrigger>
            <SelectContent>
              {subProcessos.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label htmlFor="dono" className="text-sm font-medium text-muted-foreground">Dono/Solicitante</label>
          <Select value={selectedOwner} onValueChange={setSelectedOwner}>
            <SelectTrigger id="dono"><SelectValue placeholder="Selecionar Dono/Solicitante" /></SelectTrigger>
            <SelectContent>
               {donos.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label htmlFor="responsavel" className="text-sm font-medium text-muted-foreground">Responsável</label>
          <Select value={selectedResponsavel} onValueChange={setSelectedResponsavel}>
            <SelectTrigger id="responsavel"><SelectValue placeholder="Selecionar Responsável" /></SelectTrigger>
            <SelectContent>
              {responsaveis.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-1 lg:col-start-1 xl:col-start-auto">
          <label htmlFor="n3Responsavel" className="text-sm font-medium text-muted-foreground">N3 Responsável</label>
          <Select value={selectedN3Responsavel} onValueChange={setSelectedN3Responsavel}>
            <SelectTrigger id="n3Responsavel"><SelectValue placeholder="Selecionar N3" /></SelectTrigger>
            <SelectContent>
              {n3Responsaveis.map(n3 => <SelectItem key={n3} value={n3}>{n3}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex justify-end space-x-2 pt-4">
        <Button variant="outline" onClick={handleResetFilters}>
          <RotateCcw className="mr-2 h-4 w-4" /> Limpar Filtros
        </Button>
        <Button variant="default" onClick={handleExtractXlsx} disabled={unifiedTableData.length === 0}>
          <Download className="mr-2 h-4 w-4" /> Extrair matriz
        </Button>
      </div>
    </div>
  );
  
  if (isLoading) {
    return (
        <div className="flex items-center justify-center h-screen">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="ml-2">Carregando dados da matriz...</p>
        </div>
    );
  }

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

            <Accordion type="single" collapsible defaultValue="item-1" className="w-full">
              <AccordionItem value="item-1" className="border rounded-lg shadow-md bg-card">
                <AccordionTrigger className="p-6 hover:no-underline">
                  <div className="flex items-center gap-2 text-xl font-semibold text-card-foreground">
                    <Filter className="h-5 w-5 text-primary" />
                    <span>Filtrar Matriz Geral</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pt-0">
                  {renderFilters()}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            
            <Card className="shadow-md w-full">
              <CardHeader>
                <CardTitle>Matriz Geral de Controles e Solicitações</CardTitle>
                <CardDescription>
                  Visualize controles ativos e solicitações pendentes. Use o ícone <Eye className="inline h-4 w-4" /> para ver detalhes.
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
                        Explore todos os controles internos atualmente ativos na organização. Use o ícone <Eye className="inline h-4 w-4" /> para ver detalhes.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Accordion type="single" collapsible className="w-full mb-6">
                        <AccordionItem value="item-1" className="border rounded-lg bg-muted/50">
                            <AccordionTrigger className="px-4 py-3 hover:no-underline font-semibold">
                                <div className="flex items-center gap-2">
                                    <Filter className="h-4 w-4" />
                                    Mostrar/Ocultar Filtros
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="p-4 border-t">
                                {renderFilters()}
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                   {renderUnifiedTable(unifiedTableData.filter(item => item.itemType === 'Controle Ativo'))}
                </CardContent>
            </Card>
        </div>
      )}
      <ControlDetailSheet 
        item={selectedItem}
        open={!!selectedItem}
        onOpenChange={(open) => {
            if (!open) {
                setSelectedItem(null);
            }
        }}
      />
    </div>
  );
}

