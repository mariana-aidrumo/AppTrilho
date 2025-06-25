// src/app/sox-matrix/page.tsx
'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SoxControl, ChangeRequest } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Eye, Filter, RotateCcw, Search, CheckSquare, TrendingUp, Users, LayoutDashboard, Layers, Download, ListChecks, Loader2, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useUserProfile } from "@/contexts/user-profile-context";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import * as xlsx from 'xlsx';
import { getSoxControls, getChangeRequests, getFilterOptions } from "@/services/sox-service";
import { appToSpDisplayNameMapping } from "@/lib/sharepoint-utils";

type UnifiedTableItemType = 'Controle Ativo' | 'Solicitação de Alteração';

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

const tableColumnsConfig = [
    { key: 'previousDisplayId', label: 'Cód Controle ANTERIOR' },
    { key: 'processo', label: 'Processo' },
    { key: 'subProcesso', label: 'Sub-Processo' },
    { key: 'displayId', label: 'Código NOVO' },
    { key: 'name', label: 'Nome do Controle' },
    { key: 'description', label: 'Descrição do controle ATUAL' },
    { key: 'controlFrequency', label: 'Frequência' },
    { key: 'modalidade', label: 'Modalidade' },
    { key: 'controlType', label: 'P/D' },
    { key: 'ownerOrRequester', label: 'Dono do Controle (Control owner)' },
];
const LOCAL_STORAGE_KEY_VISIBLE_COLUMNS = 'visibleSoxMatrixColumns';
const LOCAL_STORAGE_KEY_COLUMN_WIDTHS = 'soxMatrixColumnWidths';

const DEFAULT_WIDTHS: Record<string, number> = {
    previousDisplayId: 150,
    processo: 150,
    subProcesso: 180,
    displayId: 150,
    name: 300,
    description: 350,
    controlFrequency: 120,
    modalidade: 120,
    controlType: 100,
    ownerOrRequester: 200,
};

const ControlDetailSheet = ({ item, open, onOpenChange }: { item: UnifiedTableItem | null; open: boolean; onOpenChange: (open: boolean) => void; }) => {
  const [visibleFields, setVisibleFields] = useState<Set<string>>(new Set());
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (open) { // Only load from localStorage when sheet is opened
      try {
        const stored = localStorage.getItem('visibleDetailFields');
        // Default to all known fields being visible
        const defaultVisible = new Set(Object.values(appToSpDisplayNameMapping));
        
        if (stored) {
          setVisibleFields(new Set(JSON.parse(stored)));
        } else {
          // If nothing is in storage, use the default set of all fields
          setVisibleFields(defaultVisible);
        }
      } catch (e) {
        console.error("Failed to parse visible fields from localStorage", e);
        // Fallback to all fields on error
        setVisibleFields(new Set(Object.values(appToSpDisplayNameMapping)));
      } finally {
        setHasLoaded(true);
      }
    } else {
      setHasLoaded(false); // Reset on close
    }
  }, [open]);


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

  const isVisible = (key: keyof typeof appToSpDisplayNameMapping) => {
    return visibleFields.has(appToSpDisplayNameMapping[key]);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{item.name}</SheetTitle>
          <SheetDescription>Detalhes completos do controle e suas responsabilidades.</SheetDescription>
        </SheetHeader>
        <div className="py-4">
            {!hasLoaded && <div className="flex justify-center items-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>}
            {hasLoaded && (
              <>
                <SectionHeader title="Histórico (De-Para)" />
                <dl>
                    {isVisible('codigoAnterior') && <DetailRow label="Cód Controle ANTERIOR" value={item.codigoAnterior} />}
                </dl>

                <SectionHeader title="Informações Gerais" />
                <dl>
                    {isVisible('matriz') && <DetailRow label="Matriz" value={item.matriz} />}
                    {isVisible('processo') && <DetailRow label="Processo" value={item.processo} />}
                    {isVisible('subProcesso') && <DetailRow label="Sub-Processo" value={item.subProcesso} />}
                    {isVisible('riscoId') && <DetailRow label="Risco" value={item.riscoId} />}
                    {isVisible('riscoDescricao') && <DetailRow label="Descrição do Risco" value={item.riscoDescricao} />}
                    {isVisible('riscoClassificacao') && <DetailRow label="Classificação do Risco" value={item.riscoClassificacao} />}
                </dl>

                <SectionHeader title="Informações do Controle" />
                <dl>
                    {isVisible('controlId') && <DetailRow label="Código NOVO" value={item.displayId} />}
                    {isVisible('codigoCosan') && <DetailRow label="Código COSAN" value={item.codigoCosan} />}
                    {isVisible('objetivoControle') && <DetailRow label="Objetivo do Controle" value={item.objetivoControle} />}
                    {isVisible('controlName') && <DetailRow label="Nome do Controle" value={item.name} />}
                    {isVisible('description') && <DetailRow label="Descrição do controle ATUAL" value={<div className="whitespace-pre-wrap">{item.description}</div>} />}
                    {isVisible('tipo') && <DetailRow label="Tipo" value={item.tipo} />}
                    {isVisible('controlFrequency') && <DetailRow label="Frequência" value={item.controlFrequency} />}
                    {isVisible('modalidade') && <DetailRow label="Modalidade" value={item.modalidade} />}
                    {isVisible('controlType') && <DetailRow label="P/D" value={item.controlType} />}
                    {isVisible('mrc') && <DetailRow label="MRC?" value={item.mrc === false ? 'Não' : item.mrc === true ? 'Sim' : 'N/A'} />}
                    {isVisible('evidenciaControle') && <DetailRow label="Evidência do controle" value={<div className="whitespace-pre-wrap">{item.evidenciaControle}</div>} />}
                    {isVisible('implementacaoData') && <DetailRow label="Implementação" value={item.implementacaoData} />}
                    {isVisible('dataUltimaAlteracao') && <DetailRow label="Data última alteração" value={item.dataUltimaAlteracao} />}
                    {isVisible('sistemasRelacionados') && <DetailRow label="Sistemas Relacionados" value={item.sistemasRelacionados?.join(', ')} />}
                    {isVisible('transacoesTelasMenusCriticos') && <DetailRow label="Transações/Telas/Menus críticos" value={item.transacoesTelasMenusCriticos} />}
                    {isVisible('aplicavelIPE') && <DetailRow label="Aplicável IPE?" value={item.aplicavelIPE === false ? 'Não' : item.aplicavelIPE === true ? 'Sim' : 'N/A'} />}
                    {isVisible('ipe_C') && <DetailRow label="C" value={item.ipe_C ? 'X' : ''} />}
                    {isVisible('ipe_EO') && <DetailRow label="E/O" value={item.ipe_EO ? 'X' : ''} />}
                    {isVisible('ipe_VA') && <DetailRow label="V/A" value={item.ipe_VA ? 'X' : ''} />}
                    {isVisible('ipe_OR') && <DetailRow label="O/R" value={item.ipe_OR ? 'X' : ''} />}
                    {isVisible('ipe_PD') && <DetailRow label="P/D (IPE)" value={item.ipe_PD ? 'X' : ''} />}
                </dl>
                
                <SectionHeader title="Responsabilidades" />
                <dl>
                    {isVisible('responsavel') && <DetailRow label="Responsável" value={item.responsavel} />}
                    {isVisible('controlOwner') && <DetailRow label="Dono do Controle (Control owner)" value={item.controlOwner} />}
                    {isVisible('executorControle') && <DetailRow label="Executor do Controle" value={item.executorControle?.join('; ')} />}
                    {isVisible('executadoPor') && <DetailRow label="Executado por" value={item.executadoPor} />}
                    {isVisible('n3Responsavel') && <DetailRow label="N3 Responsável" value={item.n3Responsavel} />}
                    {isVisible('area') && <DetailRow label="Área" value={item.area} />}
                    {isVisible('vpResponsavel') && <DetailRow label="VP Responsável" value={item.vpResponsavel} />}
                </dl>

                <SectionHeader title="Malha Sul" />
                <dl>
                    {isVisible('impactoMalhaSul') && <DetailRow label="Impacto Malha Sul" value={item.impactoMalhaSul === false ? 'Não' : item.impactoMalhaSul === true ? 'Sim' : 'N/A'} />}
                </dl>

                <SectionHeader title="Sistema" />
                <dl>
                    {isVisible('sistemaArmazenamento') && <DetailRow label="Sistema Armazenamento" value={item.sistemaArmazenamento} />}
                </dl>
              </>
            )}
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

  // UI state
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set());
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  
  // Refs for column resizing
  const isResizing = useRef<string | null>(null);
  const startX = useRef<number>(0);
  const startWidth = useRef<number>(0);


  useEffect(() => {
    // Load column visibility from localStorage
    try {
      const storedVisibility = localStorage.getItem(LOCAL_STORAGE_KEY_VISIBLE_COLUMNS);
      const defaultVisible = new Set(tableColumnsConfig.map(c => c.label));
      if (storedVisibility) {
        setVisibleColumns(new Set(JSON.parse(storedVisibility)));
      } else {
        setVisibleColumns(defaultVisible);
        localStorage.setItem(LOCAL_STORAGE_KEY_VISIBLE_COLUMNS, JSON.stringify(Array.from(defaultVisible)));
      }
    } catch (e) {
      console.error("Failed to parse visible columns from localStorage", e);
      setVisibleColumns(new Set(tableColumnsConfig.map(c => c.label)));
    }
    
    // Load column widths from localStorage
    try {
      const storedWidths = localStorage.getItem(LOCAL_STORAGE_KEY_COLUMN_WIDTHS);
      if (storedWidths) {
        setColumnWidths(JSON.parse(storedWidths));
      } else {
        setColumnWidths(DEFAULT_WIDTHS);
      }
    } catch (e) {
      console.error("Failed to parse column widths from localStorage", e);
      setColumnWidths(DEFAULT_WIDTHS);
    }
  }, []);

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
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const unifiedTableData = useMemo(() => {
    const items: UnifiedTableItem[] = [];

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

    changeRequests
      .filter(req => 
        (req.status === "Pendente" || req.status === "Em Análise" || req.status === "Aguardando Feedback do Dono") &&
        !req.controlId.startsWith("NEW-CTRL-")
      )
      .forEach(req => {
        const controlDetails = soxControls.find(c => c.controlId === req.controlId);
        if (!controlDetails) return;
        
        const summaryOfChanges = Object.entries(req.changes)
          .map(([key, value]) => `${key}: ${value}`)
          .join('; ');
        
        const combinedData = { ...controlDetails, ...req.changes };

        items.push({
          ...combinedData,
          key: `request-${req.id}`,
          originalId: req.id,
          itemType: 'Solicitação de Alteração',
          previousDisplayId: controlDetails.controlId,
          displayId: req.changes.controlId || controlDetails.controlId,
          name: controlDetails.controlName,
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

  const handleExtractXlsx = (data: UnifiedTableItem[]) => {
    const dataToExport = data.map(item => ({
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

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>, columnKey: string) => {
    isResizing.current = columnKey;
    startX.current = e.clientX;
    startWidth.current = columnWidths[columnKey] || DEFAULT_WIDTHS[columnKey];
    e.preventDefault();

    const handleMouseMove = (mouseEvent: MouseEvent) => {
        if (!isResizing.current) return;
        const width = startWidth.current + (mouseEvent.clientX - startX.current);
        if (width > 50) { // Minimum width 50px
            setColumnWidths(prev => ({ ...prev, [isResizing.current!]: width }));
        }
    };

    const handleMouseUp = () => {
        isResizing.current = null;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        // Persist to localStorage after resizing is done
        setColumnWidths(currentWidths => {
          localStorage.setItem(LOCAL_STORAGE_KEY_COLUMN_WIDTHS, JSON.stringify(currentWidths));
          return currentWidths;
        });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [columnWidths]);


  const renderUnifiedTable = (items: UnifiedTableItem[]) => (
     <div className="rounded-md border mt-4 overflow-x-auto">
      <Table className="w-full" style={{ tableLayout: 'fixed' }}>
        <colgroup>
            {tableColumnsConfig.map(col => visibleColumns.has(col.label) && (
                <col key={col.key} style={{ width: `${columnWidths[col.key] || DEFAULT_WIDTHS[col.key]}px` }} />
            ))}
            <col style={{ width: '100px' }} /> {/* For actions column */}
        </colgroup>
        <TableHeader>
          <TableRow>
            {tableColumnsConfig.map(col => visibleColumns.has(col.label) && (
              <TableHead key={col.key} className="relative group/th select-none">
                {col.label}
                <div
                  onMouseDown={(e) => handleMouseDown(e, col.key)}
                  className="absolute top-0 right-0 h-full w-2 cursor-col-resize bg-border/50 opacity-0 group-hover/th:opacity-100 transition-opacity"
                />
              </TableHead>
            ))}
            <TableHead className="text-right min-w-[100px] select-none">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow
              key={item.key}
              onClick={() => handleViewDetails(item)}
              className="cursor-pointer"
            >
             {tableColumnsConfig.map(col => {
                if (!visibleColumns.has(col.label)) return null;
                const value = (item as any)[col.key];

                const cellClassName = "truncate"; // Always truncate
                
                return (
                    <TableCell key={col.key} className={cellClassName} title={typeof value === 'string' ? value : undefined}>
                        {value || "N/A"}
                    </TableCell>
                );
            })}
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
      <div className="flex justify-end pt-4">
        <Button variant="outline" onClick={handleResetFilters}>
          <RotateCcw className="mr-2 h-4 w-4" /> Limpar Filtros
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

  const renderTableActions = () => (
    <div className="flex items-center gap-2">
      <DropdownMenu>
          <DropdownMenuTrigger asChild>
              <Button variant="outline">
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  Exibir Colunas
              </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[250px]">
              <DropdownMenuLabel>Alternar visibilidade das colunas</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {tableColumnsConfig.map(column => (
                  <DropdownMenuCheckboxItem
                      key={column.key}
                      checked={visibleColumns.has(column.label)}
                      onCheckedChange={(value) => {
                          const newVisibleColumns = new Set(visibleColumns);
                          if (value) {
                              newVisibleColumns.add(column.label);
                          } else {
                              newVisibleColumns.delete(column.label);
                          }
                          setVisibleColumns(newVisibleColumns);
                          localStorage.setItem(LOCAL_STORAGE_KEY_VISIBLE_COLUMNS, JSON.stringify(Array.from(newVisibleColumns)));
                      }}
                  >
                      {column.label}
                  </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
      </DropdownMenu>

      <Button variant="default" onClick={() => handleExtractXlsx(unifiedTableData)} disabled={unifiedTableData.length === 0}>
        <Download className="mr-2 h-4 w-4" /> Extrair matriz
      </Button>
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

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1" className="border rounded-lg shadow-sm bg-card">
                <AccordionTrigger className="p-4 hover:no-underline">
                  <div className="flex items-center gap-2 font-semibold text-card-foreground">
                    <Filter className="h-4 w-4 text-primary" />
                    <span>Filtrar Matriz Geral</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pt-0">
                  {renderFilters()}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            
            <Card className="shadow-md w-full">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Matriz Geral de Controles e Solicitações</CardTitle>
                  <CardDescription>
                    Visualize controles ativos e solicitações pendentes. Use o ícone <Eye className="inline h-4 w-4" /> ou clique no controle para ver mais detalhes.
                  </CardDescription>
                </div>
                {renderTableActions()}
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
            
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1" className="border rounded-lg shadow-sm bg-card">
                <AccordionTrigger className="p-4 hover:no-underline">
                  <div className="flex items-center gap-2 font-semibold text-card-foreground">
                    <Filter className="h-4 w-4 text-primary" />
                    <span>Filtrar Matriz Geral</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pt-0">
                  {renderFilters()}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            
            <Card className="shadow-md w-full">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Matriz Geral de Controles e Solicitações</CardTitle>
                  <CardDescription>
                    Visualize controles ativos e solicitações pendentes. Use o ícone <Eye className="inline h-4 w-4" /> ou clique no controle para ver mais detalhes.
                  </CardDescription>
                </div>
                {renderTableActions()}
              </CardHeader>
              <CardContent>
                {renderUnifiedTable(unifiedTableData)}
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
