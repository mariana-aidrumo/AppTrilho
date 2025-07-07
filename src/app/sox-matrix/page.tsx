
// src/app/sox-matrix/page.tsx
'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SoxControl, ChangeRequest } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Filter, RotateCcw, Search, CheckSquare, TrendingUp, Users, LayoutDashboard, Layers, Download, ListChecks, Loader2, SlidersHorizontal, Check, ChevronsUpDown, Edit2 } from "lucide-react";
import Link from "next/link";
import { useUserProfile } from "@/contexts/user-profile-context";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import type { ReactNode } from "react";
import { useForm, Controller } from "react-hook-form";
import { cn } from "@/lib/utils";
import * as xlsx from 'xlsx';
import { getSoxControls, getChangeRequests, getSharePointColumnDetails, addChangeRequest, updateSoxControlField } from "@/services/sox-service";
import { appToSpDisplayNameMapping } from "@/lib/sharepoint-utils";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";


type UnifiedTableItemType = 'Controle Ativo';

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

const LOCAL_STORAGE_KEY_VISIBLE_COLUMNS = 'visibleSoxMatrixColumns';
const LOCAL_STORAGE_KEY_COLUMN_WIDTHS = 'soxMatrixColumnWidths';
const LOCAL_STORAGE_KEY_ADMIN_VISIBLE_FIELDS = 'visibleDetailFields';

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

const RequestChangeDialog = ({ control, onOpenChange, open }: { control: SoxControl, onOpenChange: (open: boolean) => void, open: boolean }) => {
    const { currentUser } = useUserProfile();
    const { toast } = useToast();
    const [changesToConfirm, setChangesToConfirm] = useState<{ summary: string[], requests: any[] } | null>(null);

    const form = useForm<Partial<SoxControl>>({
        defaultValues: {
            controlName: control.controlName ?? '',
            description: control.description ?? '',
            objetivoControle: control.objetivoControle ?? '',
            evidenciaControle: control.evidenciaControle ?? '',
            processo: control.processo ?? '',
            subProcesso: control.subProcesso ?? '',
            riscoId: control.riscoId ?? '',
            riscoDescricao: control.riscoDescricao ?? '',
            riscoClassificacao: control.riscoClassificacao ?? '',
            codigoCosan: control.codigoCosan ?? '',
            tipo: control.tipo ?? '',
            controlFrequency: control.controlFrequency ?? '',
            modalidade: control.modalidade ?? '',
            controlType: control.controlType ?? '',
            implementacaoData: control.implementacaoData ?? '',
            transacoesTelasMenusCriticos: control.transacoesTelasMenusCriticos ?? '',
            sistemaArmazenamento: control.sistemaArmazenamento ?? '',
            mrc: control.mrc ?? false,
            aplicavelIPE: control.aplicavelIPE ?? false,
            impactoMalhaSul: control.impactoMalhaSul ?? false,
            ipe_C: control.ipe_C ?? false,
            ipe_EO: control.ipe_EO ?? false,
            ipe_VA: control.ipe_VA ?? false,
            ipe_OR: control.ipe_OR ?? false,
            ipe_PD: control.ipe_PD ?? false,
            controlOwner: control.controlOwner ?? '',
            responsavel: control.responsavel ?? '',
            n3Responsavel: control.n3Responsavel ?? '',
            executadoPor: control.executadoPor ?? '',
            area: control.area ?? '',
            vpResponsavel: control.vpResponsavel ?? '',
            sistemasRelacionados: Array.isArray(control.sistemasRelacionados) ? control.sistemasRelacionados.join(', ') : '',
            executorControle: Array.isArray(control.executorControle) ? control.executorControle.join(', ') : '',
        },
    });
    const { handleSubmit, formState: { isSubmitting }, reset, watch } = form;
    const watchedValues = watch();

    const isFieldChanged = useCallback((fieldName: keyof SoxControl): boolean => {
        const originalValue = control[fieldName];
        const currentValue = watchedValues[fieldName];

        if (fieldName === 'sistemasRelacionados' || fieldName === 'executorControle') {
            const originalArray = Array.isArray(originalValue) ? originalValue : [];
            const currentArray = typeof currentValue === 'string' ? currentValue.split(',').map(s => s.trim()).filter(Boolean) : [];
            if (originalArray.length !== currentArray.length) return true;
            const sortedOriginal = [...originalArray].sort();
            const sortedCurrent = [...currentArray].sort();
            return sortedOriginal.some((value, index) => value !== sortedCurrent[index]);
        }

        if (typeof originalValue === 'boolean' || typeof currentValue === 'boolean') {
            return (currentValue ?? false) !== (originalValue ?? false);
        }

        return String(originalValue ?? '').trim() !== String(currentValue ?? '').trim();
    }, [control, watchedValues]);
    
    const onSubmit = (formData: Partial<SoxControl>) => {
        const changes: Partial<SoxControl> = {};

        (Object.keys(formData) as Array<keyof SoxControl>).forEach(key => {
            if (isFieldChanged(key)) {
                if (key === 'sistemasRelacionados' || key === 'executorControle') {
                     (changes as any)[key] = typeof formData[key] === 'string'
                        ? (formData[key] as string).split(',').map(s => s.trim()).filter(Boolean)
                        : [];
                } else {
                    (changes as any)[key] = formData[key];
                }
            }
        });

        if (Object.keys(changes).length === 0) {
            toast({
                title: "Nenhuma alteração detectada",
                description: "Você precisa alterar pelo menos um campo para enviar uma solicitação.",
                variant: "destructive"
            });
            return;
        }

        const appKeyToDisplayName = Object.entries(appToSpDisplayNameMapping).reduce((acc, [appKey, spName]) => { (acc as any)[appKey] = spName; return acc; }, {} as Record<string, string>);
        
        const formatValue = (val: any): string => {
            if (val === undefined || val === null || val === '') return 'vazio';
            if (Array.isArray(val)) return val.length > 0 ? val.join(', ') : 'vazio';
            if (typeof val === 'boolean') return val ? 'Sim' : 'Não';
            return String(val);
        };

        const summary = (Object.keys(changes) as Array<keyof SoxControl>).map(key => {
            const originalValue = control[key];
            const newValue = changes[key];
            const displayName = appKeyToDisplayName[key] || key;
            return `"${displayName}": de '${formatValue(originalValue)}' para '${formatValue(newValue)}'`;
        });

        const requestsToSubmit = (Object.keys(changes) as Array<keyof SoxControl>).map(key => {
            const originalValue = control[key];
            const newValue = changes[key];
            const displayName = appKeyToDisplayName[key] || key;
            
            return {
                controlId: control.controlId,
                controlName: control.controlName,
                requestedBy: currentUser.name,
                requestType: "Alteração" as "Alteração",
                comments: `Alterar "${displayName}" de '${formatValue(originalValue)}' para '${formatValue(newValue)}'`,
                fieldName: key,
                newValue: changes[key],
            };
        });
        
        setChangesToConfirm({ summary, requests: requestsToSubmit });
    };

    const handleConfirmAndSubmit = async () => {
        if (!changesToConfirm) return;

        try {
            for (const requestData of changesToConfirm.requests) {
                 await addChangeRequest(requestData);
            }
            
            toast({
                title: "Solicitações Enviadas",
                description: `${changesToConfirm.requests.length} solicitações de alteração foram enviadas para aprovação.`,
            });
            setChangesToConfirm(null);
            onOpenChange(false);
            reset();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Não foi possível enviar uma ou mais solicitações.";
            toast({
                title: "Erro ao Enviar",
                description: errorMessage,
                variant: "destructive",
                duration: 15000,
            });
        }
    };

    const dialogOpen = open && !changesToConfirm;
    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            setChangesToConfirm(null);
            onOpenChange(false);
        } else {
            onOpenChange(true);
        }
    };

    return (
        <>
            <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
                <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Solicitar Alteração para: {control.controlName}</DialogTitle>
                        <DialogDescription>
                            Edite os campos abaixo. Campos modificados serão destacados. Cada alteração gerará uma solicitação separada.
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto px-1 space-y-4">
                            <Accordion type="multiple" defaultValue={['item-1', 'item-2', 'item-3', 'item-4']} className="w-full">
                                <AccordionItem value="item-1">
                                    <AccordionTrigger>Informações Gerais</AccordionTrigger>
                                    <AccordionContent className="space-y-4 p-1">
                                        <FormField name="controlName" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Nome do Controle</FormLabel><FormControl><Input {...field} className={cn(isFieldChanged('controlName') && 'bg-accent/20 border-accent')} /></FormControl></FormItem> )} />
                                        <FormField name="processo" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Processo</FormLabel><FormControl><Input {...field} className={cn(isFieldChanged('processo') && 'bg-accent/20 border-accent')} /></FormControl></FormItem> )} />
                                        <FormField name="subProcesso" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Sub-Processo</FormLabel><FormControl><Input {...field} className={cn(isFieldChanged('subProcesso') && 'bg-accent/20 border-accent')} /></FormControl></FormItem> )} />
                                        <FormField name="objetivoControle" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Objetivo do Controle</FormLabel><FormControl><Textarea {...field} className={cn(isFieldChanged('objetivoControle') && 'bg-accent/20 border-accent')} /></FormControl></FormItem> )} />
                                        <FormField name="description" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Descrição do Controle ATUAL</FormLabel><FormControl><Textarea {...field} className={cn('min-h-[100px]', isFieldChanged('description') && 'bg-accent/20 border-accent')} /></FormControl></FormItem> )} />
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="item-2">
                                    <AccordionTrigger>Detalhes do Controle</AccordionTrigger>
                                    <AccordionContent className="space-y-4 p-1">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            <FormField name="controlFrequency" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Frequência</FormLabel><FormControl><Input {...field} className={cn(isFieldChanged('controlFrequency') && 'bg-accent/20 border-accent')} /></FormControl></FormItem> )} />
                                            <FormField name="controlType" control={form.control} render={({ field }) => ( <FormItem><FormLabel>P/D (Preventivo/Detectivo)</FormLabel><FormControl><Input {...field} className={cn(isFieldChanged('controlType') && 'bg-accent/20 border-accent')} /></FormControl></FormItem> )} />
                                            <FormField name="modalidade" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Modalidade</FormLabel><FormControl><Input {...field} className={cn(isFieldChanged('modalidade') && 'bg-accent/20 border-accent')} /></FormControl></FormItem> )} />
                                            <FormField name="tipo" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Tipo</FormLabel><FormControl><Input {...field} className={cn(isFieldChanged('tipo') && 'bg-accent/20 border-accent')} /></FormControl></FormItem> )} />
                                            <FormField name="codigoCosan" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Código COSAN</FormLabel><FormControl><Input {...field} className={cn(isFieldChanged('codigoCosan') && 'bg-accent/20 border-accent')} /></FormControl></FormItem> )} />
                                            <FormField name="implementacaoData" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Implementação Data</FormLabel><FormControl><Input {...field} className={cn(isFieldChanged('implementacaoData') && 'bg-accent/20 border-accent')} /></FormControl></FormItem> )} />
                                        </div>
                                        <FormField name="evidenciaControle" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Evidência do controle</FormLabel><FormControl><Textarea {...field} className={cn(isFieldChanged('evidenciaControle') && 'bg-accent/20 border-accent')} /></FormControl></FormItem> )} />
                                        <FormField name="sistemasRelacionados" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Sistemas Relacionados (separados por vírgula)</FormLabel><FormControl><Input {...field} className={cn(isFieldChanged('sistemasRelacionados') && 'bg-accent/20 border-accent')} /></FormControl></FormItem> )} />
                                        <FormField name="transacoesTelasMenusCriticos" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Transações/Telas/Menus críticos</FormLabel><FormControl><Input {...field} className={cn(isFieldChanged('transacoesTelasMenusCriticos') && 'bg-accent/20 border-accent')} /></FormControl></FormItem> )} />
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="item-3">
                                    <AccordionTrigger>Responsabilidades</AccordionTrigger>
                                    <AccordionContent className="space-y-4 p-1">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormField name="controlOwner" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Dono do Controle</FormLabel><FormControl><Input {...field} className={cn(isFieldChanged('controlOwner') && 'bg-accent/20 border-accent')} /></FormControl></FormItem> )} />
                                            <FormField name="responsavel" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Responsável</FormLabel><FormControl><Input {...field} className={cn(isFieldChanged('responsavel') && 'bg-accent/20 border-accent')} /></FormControl></FormItem> )} />
                                            <FormField name="n3Responsavel" control={form.control} render={({ field }) => ( <FormItem><FormLabel>N3 Responsável</FormLabel><FormControl><Input {...field} className={cn(isFieldChanged('n3Responsavel') && 'bg-accent/20 border-accent')} /></FormControl></FormItem> )} />
                                            <FormField name="executadoPor" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Executado por</FormLabel><FormControl><Input {...field} className={cn(isFieldChanged('executadoPor') && 'bg-accent/20 border-accent')} /></FormControl></FormItem> )} />
                                            <FormField name="area" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Área</FormLabel><FormControl><Input {...field} className={cn(isFieldChanged('area') && 'bg-accent/20 border-accent')} /></FormControl></FormItem> )} />
                                            <FormField name="vpResponsavel" control={form.control} render={({ field }) => ( <FormItem><FormLabel>VP Responsável</FormLabel><FormControl><Input {...field} className={cn(isFieldChanged('vpResponsavel') && 'bg-accent/20 border-accent')} /></FormControl></FormItem> )} />
                                        </div>
                                        <FormField name="executorControle" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Executor do Controle (separados por vírgula)</FormLabel><FormControl><Input {...field} className={cn(isFieldChanged('executorControle') && 'bg-accent/20 border-accent')} /></FormControl></FormItem> )} />
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="item-4">
                                    <AccordionTrigger>Configurações Adicionais</AccordionTrigger>
                                    <AccordionContent className="space-y-4 p-1">
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-4">
                                            <FormField control={form.control} name="mrc" render={({ field }) => ( <FormItem className={cn("flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm col-span-1", isFieldChanged('mrc') && 'bg-accent/20 border-accent')}><div className="space-y-0.5"><FormLabel>MRC?</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                                            <FormField control={form.control} name="aplicavelIPE" render={({ field }) => ( <FormItem className={cn("flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm col-span-1", isFieldChanged('aplicavelIPE') && 'bg-accent/20 border-accent')}><div className="space-y-0.5"><FormLabel>Aplicável IPE?</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                                            <FormField control={form.control} name="impactoMalhaSul" render={({ field }) => ( <FormItem className={cn("flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm col-span-1", isFieldChanged('impactoMalhaSul') && 'bg-accent/20 border-accent')}><div className="space-y-0.5"><FormLabel>Impacto Malha Sul?</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                                        </div>
                                         <div className={cn("border p-4 rounded-md", (isFieldChanged('ipe_C') || isFieldChanged('ipe_EO') || isFieldChanged('ipe_VA') || isFieldChanged('ipe_OR') || isFieldChanged('ipe_PD')) && 'bg-accent/20 border-accent')}>
                                            <Label className="text-base font-medium">Asserções IPE</Label>
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-2">
                                                <FormField control={form.control} name="ipe_C" render={({ field }) => (<FormItem className="flex flex-row items-start space-x-3 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>C</FormLabel></div></FormItem>)} />
                                                <FormField control={form.control} name="ipe_EO" render={({ field }) => (<FormItem className="flex flex-row items-start space-x-3 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>E/O</FormLabel></div></FormItem>)} />
                                                <FormField control={form.control} name="ipe_VA" render={({ field }) => (<FormItem className="flex flex-row items-start space-x-3 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>V/A</FormLabel></div></FormItem>)} />
                                                <FormField control={form.control} name="ipe_OR" render={({ field }) => (<FormItem className="flex flex-row items-start space-x-3 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>O/R</FormLabel></div></FormItem>)} />
                                                <FormField control={form.control} name="ipe_PD" render={({ field }) => (<FormItem className="flex flex-row items-start space-x-3 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>P/D (IPE)</FormLabel></div></FormItem>)} />
                                            </div>
                                        </div>
                                        <FormField name="sistemaArmazenamento" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Sistema de Armazenamento</FormLabel><FormControl><Input {...field} className={cn(isFieldChanged('sistemaArmazenamento') && 'bg-accent/20 border-accent')} /></FormControl></FormItem> )} />
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </form>
                    </Form>
                    <DialogFooter className="border-t pt-4 mt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                        <Button type="submit" onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
                            Revisar e Enviar Alterações
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!changesToConfirm} onOpenChange={(isOpen) => !isOpen && setChangesToConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Resumo das Alterações</AlertDialogTitle>
                        <AlertDialogDescription>
                            Você está prestes a enviar as seguintes solicitações de alteração. Por favor, confirme:
                            <ul className="mt-4 list-disc pl-5 space-y-1 text-sm text-foreground max-h-60 overflow-y-auto">
                                {changesToConfirm?.summary.map((s, i) => <li key={i}>{s}</li>)}
                            </ul>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setChangesToConfirm(null)} disabled={isSubmitting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmAndSubmit} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Confirmar Envio
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

const ControlDetailSheet = ({ item, open, onOpenChange, allColumns, changeRequests }: { 
  item: UnifiedTableItem | null; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  allColumns: { key: string, label: string }[];
  changeRequests: ChangeRequest[];
}) => {
  const [visibleFields, setVisibleFields] = useState<Set<string>>(new Set());
  const [hasLoaded, setHasLoaded] = useState(false);
  const { currentUser, isUserControlOwner, isUserAdmin } = useUserProfile();
  const [isRequestChangeDialogOpen, setIsRequestChangeDialogOpen] = useState(false);

  useEffect(() => {
    if (open) { 
      try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY_ADMIN_VISIBLE_FIELDS);
        const defaultVisible = new Set(allColumns.map(c => c.label));
        
        if (stored) {
          setVisibleFields(new Set(JSON.parse(stored)));
        } else {
          setVisibleFields(defaultVisible);
        }
      } catch (e) {
        console.error("Failed to parse visible fields from localStorage", e);
        setVisibleFields(new Set(allColumns.map(c => c.label)));
      } finally {
        setHasLoaded(true);
      }
    } else {
      setHasLoaded(false); 
    }
  }, [open, allColumns]);

  const controlHistory = useMemo(() => {
    if (!item || !changeRequests) return [];
    return changeRequests
      .filter(req => req.controlId === item.controlId)
      .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
  }, [item, changeRequests]);


  if (!item) return null;

  const DetailRow = ({ label, value }: { label: string; value?: ReactNode }) => {
    let displayValue: ReactNode = value;
    if (Array.isArray(value)) {
       displayValue = value.join(', ');
    } else if (typeof value === 'boolean') {
       displayValue = value ? 'Sim' : 'Não';
    }

    if (displayValue === null || displayValue === undefined || displayValue === '') {
      return null;
    }
    
    const isLongText = typeof displayValue === 'string' && (displayValue.includes('\n') || displayValue.length > 80);

    return (
       <div className="grid grid-cols-12 gap-4 px-4 py-3 text-sm">
         <dt className="col-span-4 font-semibold text-muted-foreground">{label}</dt>
         <dd className={cn("col-span-8", isLongText && "whitespace-pre-wrap")}>
           {displayValue}
         </dd>
       </div>
    );
  };
  
  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-3xl flex flex-col">
          <SheetHeader>
            <SheetTitle>{item.name}</SheetTitle>
            <SheetDescription>Detalhes completos e histórico de alterações do controle.</SheetDescription>
          </SheetHeader>
          <div className="py-4 flex-1 overflow-y-auto">
              {!hasLoaded && <div className="flex justify-center items-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>}
              {hasLoaded && (
                <Tabs defaultValue="details" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="details">Detalhes do Controle</TabsTrigger>
                    <TabsTrigger value="history">Histórico Controle</TabsTrigger>
                  </TabsList>
                  <TabsContent value="details" className="mt-4">
                    <dl className="divide-y divide-border rounded-lg border bg-muted/30">
                      {allColumns.map(col => {
                          if (!visibleFields.has(col.label)) {
                            return null;
                          }
                          const value = (item as any)[col.key];
                          return <DetailRow key={col.key} label={col.label} value={value} />;
                      })}
                    </dl>
                  </TabsContent>
                  <TabsContent value="history" className="mt-4">
                    {controlHistory.length > 0 ? (
                      <div className="space-y-4">
                        {controlHistory.map(log => (
                           <div key={log.id} className="relative pl-6 border-l-2 border-border">
                              <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-primary" />
                              <p className="text-sm font-semibold">{log.requestType} por {log.requestedBy}</p>
                              <p className="text-xs text-muted-foreground">{new Date(log.requestDate).toLocaleString('pt-BR')}</p>
                              <div className="mt-2 p-3 bg-muted/50 rounded-md">
                                  <p className="text-sm"><strong>Status:</strong> {log.status}</p>
                                  <p className="text-sm text-foreground/80 whitespace-pre-wrap"><strong>Detalhes:</strong> {log.comments}</p>
                                  {log.reviewedBy && <p className="text-sm mt-1"><strong>Revisado por:</strong> {log.reviewedBy} em {log.reviewDate ? new Date(log.reviewDate).toLocaleDateString('pt-BR') : ''}</p>}
                                  {log.adminFeedback && <p className="text-sm mt-1"><strong>Feedback:</strong> {log.adminFeedback}</p>}
                              </div>
                           </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-center text-muted-foreground py-8">Nenhum histórico de alterações encontrado para este controle.</p>
                    )}
                  </TabsContent>
                </Tabs>
              )}
          </div>
           <SheetFooter className="mt-auto border-t pt-4">
                {isUserControlOwner() && !isUserAdmin() && (
                    <Button onClick={() => setIsRequestChangeDialogOpen(true)}>
                       <Edit2 className="mr-2 h-4 w-4" />
                       Solicitar Alteração
                    </Button>
                )}
            </SheetFooter>
        </SheetContent>
      </Sheet>
      {isRequestChangeDialogOpen && item && (
          <RequestChangeDialog
              control={item as SoxControl}
              open={isRequestChangeDialogOpen}
              onOpenChange={setIsRequestChangeDialogOpen}
          />
      )}
    </>
  );
};


export default function SoxMatrixPage() {
  const { currentUser, isUserAdmin, isUserControlOwner } = useUserProfile();
  const { toast } = useToast();

  // Data states from server
  const [soxControls, setSoxControls] = useState<SoxControl[]>([]);
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [allPossibleColumns, setAllPossibleColumns] = useState<{ key: string, label: string }[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProcess, setSelectedProcess] = useState("Todos");
  const [selectedSubProcess, setSelectedSubProcess] = useState("Todos");
  const [selectedOwner, setSelectedOwner] = useState("Todos");
  const [selectedResponsavel, setSelectedResponsavel] = useState("Todos");
  const [selectedN3Responsavel, setSelectedN3Responsavel] = useState("Todos");
  const [selectedItem, setSelectedItem] = useState<UnifiedTableItem | null>(null);

  // Combobox popover states
  const [processoPopoverOpen, setProcessoPopoverOpen] = useState(false);
  const [subProcessoPopoverOpen, setSubProcessoPopoverOpen] = useState(false);
  const [ownerPopoverOpen, setOwnerPopoverOpen] = useState(false);
  const [responsavelPopoverOpen, setResponsavelPopoverOpen] = useState(false);
  const [n3ResponsavelPopoverOpen, setN3ResponsavelPopoverOpen] = useState(false);

  // Column configuration states
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set());
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  
  // Refs for column resizing
  const isResizing = useRef<string | null>(null);
  const startX = useRef<number>(0);
  const startWidth = useRef<number>(0);

  const handleFieldUpdate = async (spListItemId: string, appKey: keyof SoxControl, newValue: string, originalValue: any) => {
    if (String(newValue || '').trim() === String(originalValue || '').trim()) {
        return; // No change, do nothing
    }

    const fieldToUpdate = { appKey, value: newValue };

    try {
        await updateSoxControlField(spListItemId, fieldToUpdate);
        toast({
            title: "Campo Atualizado",
            description: `O controle foi atualizado com sucesso.`,
        });
        
        // Optimistically update local state for instant feedback
        setSoxControls(prevControls => 
            prevControls.map(c => 
                c.id === spListItemId ? { ...c, [appKey]: newValue } : c
            )
        );

    } catch (error: any) {
        toast({
            title: "Erro ao Atualizar",
            description: error.message,
            variant: "destructive",
        });
        // You could revert the change here on error if needed, but a toast is often sufficient.
    }
  };
  
  // Dynamically generate filter options from loaded data
  const processos = useMemo(() => {
    const allProcessos = soxControls.map(c => c.processo).filter(Boolean);
    return ["Todos", ...Array.from(new Set(allProcessos)).sort()];
  }, [soxControls]);

  const subProcessos = useMemo(() => {
    const allSubProcessos = soxControls.map(c => c.subProcesso).filter(Boolean);
    return ["Todos", ...Array.from(new Set(allSubProcessos)).sort()];
  }, [soxControls]);

  const donos = useMemo(() => {
    const controlOwners = soxControls.map(c => c.controlOwner).filter(Boolean);
    return ["Todos", ...Array.from(new Set(controlOwners)).sort()];
  }, [soxControls]);

  const responsaveis = useMemo(() => {
    const allResponsaveis = soxControls.map(c => c.responsavel).filter(Boolean);
    return ["Todos", ...Array.from(new Set(allResponsaveis)).sort()];
  }, [soxControls]);
  
  const n3Responsaveis = useMemo(() => {
    const allN3 = soxControls.map(c => c.n3Responsavel).filter(Boolean);
    return ["Todos", ...Array.from(new Set(allN3)).sort()];
  }, [soxControls]);

  // Columns allowed by admin config, derived from allPossibleColumns and localStorage
  const displayableColumns = useMemo(() => {
    if (typeof window === 'undefined' || !allPossibleColumns.length) return [];
    
    try {
        const storedAdminConfig = localStorage.getItem(LOCAL_STORAGE_KEY_ADMIN_VISIBLE_FIELDS);
        if (!storedAdminConfig) return allPossibleColumns;

        const adminAllowedFields = new Set(JSON.parse(storedAdminConfig));
        return allPossibleColumns.filter(col => adminAllowedFields.has(col.label));

    } catch (e) {
        console.error("Failed to parse admin column configuration", e);
        return allPossibleColumns;
    }
  }, [allPossibleColumns]);


  // Effect to load server data and ALL possible columns
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [controlsData, requestsData, allColumnsData] = await Promise.all([
          getSoxControls(),
          getChangeRequests(),
          getSharePointColumnDetails()
        ]);
        
        const uniqueControls = Array.from(new Map(controlsData.map(c => [c.id, c])).values());
        setSoxControls(uniqueControls);
        setChangeRequests(requestsData);
        
        const spDisplayNameToAppKey = Object.entries(appToSpDisplayNameMapping).reduce(
            (acc, [appKey, spName]) => {
                (acc as any)[spName] = appKey;
                return acc;
            }, {} as Record<string, string>
        );

        const allColumnsFromSp = allColumnsData.map(c => ({
            key: spDisplayNameToAppKey[c.displayName] || c.displayName.replace(/\s+/g, ''),
            label: c.displayName,
        }));
        setAllPossibleColumns(allColumnsFromSp);

      } catch (error) {
        console.error("Failed to load SOX Matrix data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);
  
  // Effect to initialize UI settings (visible columns, widths) based on user config and what's displayable
  useEffect(() => {
    if (displayableColumns.length === 0) return; 

    try {
        const storedUserVisibility = localStorage.getItem(LOCAL_STORAGE_KEY_VISIBLE_COLUMNS);
        const defaultSummaryLabels = new Set(Object.values(appToSpDisplayNameMapping));
        
        const userPreferredColumns = storedUserVisibility
            ? new Set(JSON.parse(storedUserVisibility))
            : defaultSummaryLabels; 

        const displayableLabels = new Set(displayableColumns.map(c => c.label));
        const finalVisible = new Set(
            [...userPreferredColumns].filter(label => displayableLabels.has(label))
        );
        setVisibleColumns(finalVisible);
    } catch (e) {
        console.error("Failed to parse user column visibility", e);
        const displayableLabels = new Set(displayableColumns.map(c => c.label));
        const defaultVisible = new Set(
            Object.values(appToSpDisplayNameMapping).filter(label => displayableLabels.has(label))
        );
        setVisibleColumns(defaultVisible);
    }

    try {
        const storedWidths = localStorage.getItem(LOCAL_STORAGE_KEY_COLUMN_WIDTHS);
        setColumnWidths(storedWidths ? JSON.parse(storedWidths) : DEFAULT_WIDTHS);
    } catch(e) {
        console.error("Failed to parse column widths", e);
        setColumnWidths(DEFAULT_WIDTHS);
    }
  }, [displayableColumns]);


  const unifiedTableData = useMemo(() => {
    return soxControls
      .filter(control => control.status === "Ativo")
      .map((control): UnifiedTableItem => ({
        ...control,
        key: `control-${control.id}`,
        originalId: control.id,
        itemType: 'Controle Ativo',
        previousDisplayId: control.codigoAnterior || "N/A",
        displayId: control.controlId,
        name: control.controlName,
        ownerOrRequester: control.controlOwner,
      }))
      .filter(item => {
        const lowerSearchTerm = searchTerm.toLowerCase();
        const matchesSearch = searchTerm === "" ||
          item.displayId?.toLowerCase().includes(lowerSearchTerm) ||
          (item.previousDisplayId || '').toLowerCase().includes(lowerSearchTerm) ||
          item.name?.toLowerCase().includes(lowerSearchTerm);

        const matchesProcess = selectedProcess === "Todos" || item.processo === selectedProcess;
        const matchesSubProcess = selectedSubProcess === "Todos" || item.subProcesso === selectedSubProcess;
        const matchesOwner = selectedOwner === "Todos" || item.ownerOrRequester === selectedOwner;
        const matchesResponsavelFilter = selectedResponsavel === "Todos" || item.responsavel === selectedResponsavel;
        const matchesN3ResponsavelFilter = selectedN3Responsavel === "Todos" || item.n3Responsavel === selectedN3Responsavel;

        return matchesSearch && matchesProcess && matchesSubProcess && matchesOwner && matchesResponsavelFilter && matchesN3ResponsavelFilter;
      });

  }, [searchTerm, selectedProcess, selectedSubProcess, selectedOwner, selectedResponsavel, selectedN3Responsavel, soxControls]);


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
    const fullControl = soxControls.find(c => c.id === item.originalId);
    setSelectedItem(fullControl as UnifiedTableItem);
  };

  const handleExtractXlsx = (data: UnifiedTableItem[]) => {
    const dataToExport = data.map(item => {
      const exportRow: { [key: string]: any } = {};
      
      allPossibleColumns.forEach(col => {
        let value: any = (item as any)[col.key];
        
        if (Array.isArray(value)) {
          value = value.join('; ');
        } else if (typeof value === 'boolean') {
          value = value ? 'Sim' : 'Não';
        }
        
        exportRow[col.label] = value ?? "";
      });
      return exportRow;
    });

    const headers = allPossibleColumns.map(c => c.label);
    
    const ws = xlsx.utils.json_to_sheet(dataToExport, { header: headers });
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Matriz de Controles");
    xlsx.writeFile(wb, "matriz_completa_controles.xlsx");
  };

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>, columnKey: string) => {
    isResizing.current = columnKey;
    startX.current = e.clientX;
    startWidth.current = columnWidths[columnKey] || DEFAULT_WIDTHS[columnKey];
    e.preventDefault();

    const handleMouseMove = (mouseEvent: MouseEvent) => {
        if (!isResizing.current) return;
        const width = startWidth.current + (mouseEvent.clientX - startX.current);
        if (width > 50) { 
            setColumnWidths(prev => ({ ...prev, [isResizing.current!]: width }));
        }
    };

    const handleMouseUp = () => {
        isResizing.current = null;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        setColumnWidths(currentWidths => {
          localStorage.setItem(LOCAL_STORAGE_KEY_COLUMN_WIDTHS, JSON.stringify(currentWidths));
          return currentWidths;
        });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [columnWidths]);


  const renderUnifiedTable = (items: UnifiedTableItem[]) => {
    const EDITABLE_COLUMNS: (keyof SoxControl)[] = ['processo', 'subProcesso', 'controlName', 'description', 'controlFrequency', 'modalidade', 'controlType', 'controlOwner', 'responsavel', 'n3Responsavel'];
    
    return (
     <div className="rounded-md border mt-4 overflow-x-auto">
      <Table className="w-full" style={{ tableLayout: 'fixed' }}>
        <colgroup>{displayableColumns.map(col => visibleColumns.has(col.label) ? (<col key={col.key} style={{ width: `${columnWidths[col.key] || DEFAULT_WIDTHS[col.key] || 150}px` }} />) : null)}<col style={{ width: '100px' }} /></colgroup>
        <TableHeader>
          <TableRow>
            {displayableColumns.map(col => visibleColumns.has(col.label) && (
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
          {items.map((item) => {
            return (
            <TableRow
              key={item.key}
            >
             {displayableColumns.map(col => {
                if (!visibleColumns.has(col.label)) return null;
                const value = (item as any)[col.key];
                const isEditable = isUserAdmin() && EDITABLE_COLUMNS.includes(col.key as keyof SoxControl);
                
                return (
                    <TableCell key={col.key} className="truncate" title={typeof value === 'string' ? value : undefined}>
                        {isEditable ? (
                             <Input
                                defaultValue={value || ''}
                                onBlur={(e) => handleFieldUpdate(item.originalId, col.key as keyof SoxControl, e.target.value, value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                                className="h-auto p-0 border-0 rounded-none bg-transparent shadow-none ring-offset-background focus-visible:ring-1 focus-visible:ring-ring focus-visible:bg-background"
                            />
                        ) : (
                          <span>{Array.isArray(value) ? value.join(', ') : (value || "N/A")}</span>
                        )}
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
          )})}
        </TableBody>
      </Table>
       {items.length === 0 && !isLoading && (
        <p className="mt-4 mb-4 text-center text-muted-foreground">
          Nenhum item encontrado com os filtros aplicados.
        </p>
      )}
    </div>
  )};

  const renderFilters = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
        <div className="sm:col-span-2 lg:col-span-3">
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
            <Popover open={processoPopoverOpen} onOpenChange={setProcessoPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={processoPopoverOpen} className="w-full justify-between font-normal">
                  {selectedProcess !== "Todos" ? selectedProcess : "Selecionar Processo"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0 sm:w-[250px] lg:w-[300px]" side="bottom" align="start">
                <Command>
                  <CommandInput placeholder="Pesquisar processo..." />
                  <CommandList>
                    <CommandEmpty>Nenhum processo encontrado.</CommandEmpty>
                    <CommandGroup>
                      {processos.map(p => (
                        <CommandItem key={p} value={p} onSelect={(currentValue) => { setSelectedProcess(currentValue); setProcessoPopoverOpen(false); }}>
                          <Check className={cn("mr-2 h-4 w-4", selectedProcess === p ? "opacity-100" : "opacity-0")} />
                          {p}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
        </div>

        <div>
          <label htmlFor="subprocesso" className="text-sm font-medium text-muted-foreground">Subprocesso</label>
            <Popover open={subProcessoPopoverOpen} onOpenChange={setSubProcessoPopoverOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={subProcessoPopoverOpen} className="w-full justify-between font-normal">
                        {selectedSubProcess !== "Todos" ? subProcessos.find(s => s === selectedSubProcess) || "Selecionar Subprocesso" : "Selecionar Subprocesso"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 sm:w-[250px] lg:w-[300px]" side="bottom" align="start">
                    <Command>
                        <CommandInput placeholder="Pesquisar subprocesso..." />
                        <CommandList>
                            <CommandEmpty>Nenhum subprocesso encontrado.</CommandEmpty>
                            <CommandGroup>
                                {subProcessos.map(s => (
                                    <CommandItem key={s} value={s} onSelect={(currentValue) => { setSelectedSubProcess(currentValue); setSubProcessoPopoverOpen(false); }}>
                                        <Check className={cn("mr-2 h-4 w-4", selectedSubProcess === s ? "opacity-100" : "opacity-0")} />
                                        {s}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
        
        <div>
          <label htmlFor="dono" className="text-sm font-medium text-muted-foreground">Dono/Solicitante</label>
           <Popover open={ownerPopoverOpen} onOpenChange={setOwnerPopoverOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={ownerPopoverOpen} className="w-full justify-between font-normal">
                        {selectedOwner !== "Todos" ? donos.find(o => o === selectedOwner) || "Selecionar Dono/Solicitante" : "Selecionar Dono/Solicitante"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 sm:w-[250px] lg:w-[300px]" side="bottom" align="start">
                    <Command>
                        <CommandInput placeholder="Pesquisar dono..." />
                        <CommandList>
                            <CommandEmpty>Nenhum dono encontrado.</CommandEmpty>
                            <CommandGroup>
                                {donos.map(o => (
                                    <CommandItem key={o} value={o} onSelect={(currentValue) => { setSelectedOwner(currentValue); setOwnerPopoverOpen(false); }}>
                                        <Check className={cn("mr-2 h-4 w-4", selectedOwner === o ? "opacity-100" : "opacity-0")} />
                                        {o}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>

        <div>
          <label htmlFor="responsavel" className="text-sm font-medium text-muted-foreground">Responsável</label>
          <Popover open={responsavelPopoverOpen} onOpenChange={setResponsavelPopoverOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={responsavelPopoverOpen} className="w-full justify-between font-normal">
                        {selectedResponsavel !== "Todos" ? responsaveis.find(r => r === selectedResponsavel) || "Selecionar Responsável" : "Selecionar Responsável"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 sm:w-[250px] lg:w-[300px]" side="bottom" align="start">
                    <Command>
                        <CommandInput placeholder="Pesquisar responsável..." />
                        <CommandList>
                            <CommandEmpty>Nenhum responsável encontrado.</CommandEmpty>
                            <CommandGroup>
                                {responsaveis.map(r => (
                                    <CommandItem key={r} value={r} onSelect={(currentValue) => { setSelectedResponsavel(currentValue); setResponsavelPopoverOpen(false); }}>
                                        <Check className={cn("mr-2 h-4 w-4", selectedResponsavel === r ? "opacity-100" : "opacity-0")} />
                                        {r}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
        
        <div>
          <label htmlFor="n3Responsavel" className="text-sm font-medium text-muted-foreground">N3 Responsável</label>
           <Popover open={n3ResponsavelPopoverOpen} onOpenChange={setN3ResponsavelPopoverOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={n3ResponsavelPopoverOpen} className="w-full justify-between font-normal">
                        {selectedN3Responsavel !== "Todos" ? n3Responsaveis.find(n3 => n3 === selectedN3Responsavel) || "Selecionar N3 Responsável" : "Selecionar N3 Responsável"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 sm:w-[250px] lg:w-[300px]" side="bottom" align="start">
                    <Command>
                        <CommandInput placeholder="Pesquisar N3..." />
                        <CommandList>
                            <CommandEmpty>Nenhum N3 encontrado.</CommandEmpty>
                            <CommandGroup>
                                {n3Responsaveis.map(n3 => (
                                    <CommandItem key={n3} value={n3} onSelect={(currentValue) => { setSelectedN3Responsavel(currentValue); setN3ResponsavelPopoverOpen(false); }}>
                                        <Check className={cn("mr-2 h-4 w-4", selectedN3Responsavel === n3 ? "opacity-100" : "opacity-0")} />
                                        {n3}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
      </div>
      <div className="flex justify-end pt-2">
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
              {displayableColumns.map(column => (
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
      {isUserAdmin() && (
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
                  <CardTitle>Matriz Geral de Controles</CardTitle>
                  <CardDescription>
                    Visualize e edite todos os controles ativos na matriz. Use o ícone <Eye className="inline h-4 w-4" /> para ver os detalhes completos.
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

      {isUserControlOwner() && !isUserAdmin() && (
        <div className="space-y-6 w-full">
            <CardHeader className="px-0">
                <CardTitle className="text-2xl">Painel (Visão Geral)</CardTitle>
                <CardDescription>Acompanhe os controles e suas solicitações.</CardDescription>
            </CardHeader>
            
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
                  <CardTitle>Matriz Geral de Controles</CardTitle>
                  <CardDescription>
                     Visualize todos os controles ativos na matriz. Use o ícone <Eye className="inline h-4 w-4" /> para ver os detalhes completos.
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
        allColumns={allPossibleColumns}
        changeRequests={changeRequests}
      />
    </div>
  );
}
