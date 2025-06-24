
// src/app/new-control/page.tsx
"use client";

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowLeft, Download, FileUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserProfile } from '@/contexts/user-profile-context';
import { mockChangeRequests, mockSoxControls, mockVersionHistory } from '@/data/mock-data';
import type { ChangeRequest, SoxControl } from '@/types';
import Link from 'next/link';
import * as xlsx from 'xlsx';

const ownerNewControlSchema = z.object({
  controlName: z.string().min(3, "Nome do controle é obrigatório (mínimo 3 caracteres)."),
  justificativa: z.string().min(10, "Descrição/Justificativa é obrigatória (mínimo 10 caracteres)."),
});

const adminNewControlSchema = z.object({
  controlId: z.string().min(3, "ID do Controle é obrigatório."),
  controlName: z.string().min(3, "Nome do controle é obrigatório."),
  description: z.string().min(10, "Descrição é obrigatória."),
  controlOwner: z.string().optional(),
  controlFrequency: z.string().optional(),
  controlType: z.string().optional(),
  processo: z.string().optional(),
  subProcesso: z.string().optional(),
  modalidade: z.string().optional(),
  responsavel: z.string().optional(),
  n3Responsavel: z.string().optional(),
  relatedRisks: z.string().optional(),
  testProcedures: z.string().optional(),
});

type OwnerFormValues = z.infer<typeof ownerNewControlSchema>;
type AdminFormValues = z.infer<typeof adminNewControlSchema>;
type FormValues = OwnerFormValues | AdminFormValues;

export default function NewControlPage() {
  const { toast } = useToast();
  const { currentUser, isUserAdmin } = useUserProfile();
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  const currentSchema = isUserAdmin() ? adminNewControlSchema : ownerNewControlSchema;

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<FormValues>({
    resolver: zodResolver(currentSchema),
  });

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    if (!currentUser) return;

    if (isUserAdmin()) {
      const adminData = data as AdminFormValues;
      const newControlIdNumber = mockSoxControls.length + 1;
      const newSoxControl: SoxControl = {
        id: String(newControlIdNumber),
        controlId: adminData.controlId,
        controlName: adminData.controlName,
        description: adminData.description,
        controlOwner: adminData.controlOwner || "",
        controlFrequency: adminData.controlFrequency as any || "Ad-hoc",
        controlType: adminData.controlType as any || "Preventivo",
        status: "Ativo",
        lastUpdated: new Date().toISOString(),
        relatedRisks: adminData.relatedRisks ? adminData.relatedRisks.split(',').map(r => r.trim()) : [],
        testProcedures: adminData.testProcedures || "",
        processo: adminData.processo,
        subProcesso: adminData.subProcesso,
        modalidade: adminData.modalidade as any,
        responsavel: adminData.responsavel,
        n3Responsavel: adminData.n3Responsavel,
      };
      mockSoxControls.push(newSoxControl);
      mockVersionHistory.unshift({
        id: `vh-admin-new-${newSoxControl.id}-${Date.now()}`,
        controlId: newSoxControl.id,
        changeDate: new Date().toISOString(),
        changedBy: currentUser.name,
        summaryOfChanges: `Controle ${newSoxControl.controlId} criado diretamente pelo Administrador.`,
        newValues: { ...newSoxControl },
      });
      toast({
        title: "Controle Criado!",
        description: `O controle "${adminData.controlName}" foi criado com sucesso.`,
        variant: "default",
      });

    } else {
      const ownerData = data as OwnerFormValues;
      const newRequestId = `cr-new-${Date.now()}`;
      const tempProposedId = `TEMP-${Date.now()}`;

      const newChangeRequest: ChangeRequest = {
        id: newRequestId,
        controlId: `NEW-CTRL-${tempProposedId.toUpperCase().replace(/\s+/g, '-')}`,
        requestedBy: currentUser.name,
        requestDate: new Date().toISOString(),
        changes: {
          controlName: ownerData.controlName,
          justificativa: ownerData.justificativa,
          description: ownerData.justificativa,
          controlOwner: currentUser.name,
          status: "Rascunho",
        },
        status: "Pendente",
        comments: `Proposta de novo controle: ${ownerData.controlName}.`,
      };
      mockChangeRequests.unshift(newChangeRequest);
      toast({
        title: "Proposta Enviada!",
        description: `Sua proposta para o controle "${ownerData.controlName}" foi enviada para aprovação.`,
        variant: "default",
      });
    }
    reset();
  };

  const handleDownloadTemplate = () => {
    const headers = [
      "controlId", "controlName", "description", "controlOwner", "controlFrequency",
      "controlType", "processo", "subProcesso", "modalidade", "responsavel",
      "n3Responsavel", "relatedRisks", "testProcedures", "codigoAnterior", "matriz",
      "riscoId", "riscoDescricao", "riscoClassificacao", "codigoCosan", "objetivoControle",
      "tipo", "mrc", "evidenciaControle", "implementacaoData", "dataUltimaAlteracao",
      "sistemasRelacionados", "transacoesTelasMenusCriticos", "aplicavelIPE",
      "ipe_C", "ipe_EO", "ipe_VA", "ipe_OR", "ipe_PD",
      "executorControle", "executadoPor", "area", "vpResponsavel", "impactoMalhaSul",
      "sistemaArmazenamento"
    ];
    const ws = xlsx.utils.json_to_sheet([{}], { header: headers });
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "ModeloControles");
    xlsx.writeFile(wb, "modelo_controles.xlsx");
    toast({ title: "Template Baixado", description: "Preencha o arquivo modelo_controles.xlsx e faça o upload." });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setExcelFile(event.target.files[0]);
    }
  };

  const handleProcessFile = async () => {
    if (!excelFile) {
      toast({ title: "Nenhum arquivo selecionado", description: "Por favor, selecione um arquivo Excel para processar.", variant: "destructive" });
      return;
    }
    setIsProcessingFile(true);

    const parseBoolean = (value: any): boolean => {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
            return ['true', 'sim', '1', 'yes', 'x', 's'].includes(value.toLowerCase().trim());
        }
        return !!value;
    };

    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const data = event.target?.result;
        const workbook = xlsx.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: any[] = xlsx.utils.sheet_to_json(worksheet);

        let controlsAdded = 0;
        json.forEach((row, index) => {
          // Basic validation
          if (row.controlId && row.controlName && row.description) {
             const newSoxControl: SoxControl = {
              id: String(mockSoxControls.length + 1 + index),
              status: "Ativo",
              lastUpdated: new Date().toISOString(),

              // Fields from form
              controlId: row.controlId,
              controlName: row.controlName,
              description: row.description,
              controlOwner: row.controlOwner || "",
              controlFrequency: row.controlFrequency || "Ad-hoc",
              controlType: row.controlType || "Preventivo",
              processo: row.processo,
              subProcesso: row.subProcesso,
              modalidade: row.modalidade,
              responsavel: row.responsavel,
              n3Responsavel: row.n3Responsavel,
              relatedRisks: row.relatedRisks ? String(row.relatedRisks).split(',').map(r => r.trim()) : [],
              testProcedures: row.testProcedures || "",

              // Detailed fields from type
              codigoAnterior: row.codigoAnterior,
              matriz: row.matriz,
              riscoId: row.riscoId,
              riscoDescricao: row.riscoDescricao,
              riscoClassificacao: row.riscoClassificacao,
              codigoCosan: row.codigoCosan,
              objetivoControle: row.objetivoControle,
              tipo: row.tipo,
              mrc: parseBoolean(row.mrc),
              evidenciaControle: row.evidenciaControle,
              implementacaoData: row.implementacaoData,
              dataUltimaAlteracao: row.dataUltimaAlteracao,
              sistemasRelacionados: row.sistemasRelacionados ? String(row.sistemasRelacionados).split(',').map(r => r.trim()) : [],
              transacoesTelasMenusCriticos: row.transacoesTelasMenusCriticos,
              aplicavelIPE: parseBoolean(row.aplicavelIPE),
              ipeAssertions: {
                  C: parseBoolean(row.ipe_C),
                  EO: parseBoolean(row.ipe_EO),
                  VA: parseBoolean(row.ipe_VA),
                  OR: parseBoolean(row.ipe_OR),
                  PD: parseBoolean(row.ipe_PD),
              },
              executorControle: row.executorControle ? String(row.executorControle).split(';').map(r => r.trim()) : [],
              executadoPor: row.executadoPor,
              area: row.area,
              vpResponsavel: row.vpResponsavel,
              impactoMalhaSul: parseBoolean(row.impactoMalhaSul),
              sistemaArmazenamento: row.sistemaArmazenamento,
            };
            mockSoxControls.push(newSoxControl);
            controlsAdded++;
          }
        });

        toast({
          title: "Arquivo Processado!",
          description: `${controlsAdded} de ${json.length} controles foram importados com sucesso.`,
        });
        setExcelFile(null); // Clear file input after processing
      };
      reader.onerror = () => {
          toast({ title: "Erro ao ler arquivo", description: "Não foi possível ler o arquivo selecionado.", variant: "destructive" });
      };
      reader.readAsBinaryString(excelFile);

    } catch (error) {
      console.error("Error processing Excel file:", error);
      toast({ title: "Erro no Processamento", description: "Ocorreu um erro ao processar a planilha. Verifique o formato.", variant: "destructive" });
    } finally {
      setIsProcessingFile(false);
    }
  };


  const pageTitle = isUserAdmin() ? "Criar Novo Controle" : "Solicitar Novo Controle";
  const pageDescription = isUserAdmin()
    ? "Preencha os detalhes para criar um novo controle ou use o upload em massa."
    : "Descreva o nome e a justificativa para o novo controle. Sua proposta será enviada para análise.";

  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto">
      <div className="flex items-center">
        <Button variant="outline" asChild>
          <Link href={isUserAdmin() ? "/sox-matrix" : "/my-registered-controls"}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para {isUserAdmin() ? "Painel" : "Meus Controles"}
          </Link>
        </Button>
      </div>

      {isUserAdmin() && (
        <Card>
          <CardHeader>
            <CardTitle>Criação em Massa via Excel</CardTitle>
            <CardDescription>Para adicionar múltiplos controles de uma vez, baixe o modelo, preencha e faça o upload.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Button onClick={handleDownloadTemplate} variant="secondary" className="w-full sm:w-auto">
                <Download className="mr-2 h-4 w-4" />
                Baixar Modelo Excel
              </Button>
              <div className="flex-1">
                <Label htmlFor="excel-upload" className="sr-only">Upload Excel</Label>
                <Input id="excel-upload" type="file" accept=".xlsx, .xls" onChange={handleFileChange} />
              </div>
            </div>
            {excelFile && <p className="text-sm text-muted-foreground">Arquivo selecionado: {excelFile.name}</p>}
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button onClick={handleProcessFile} disabled={!excelFile || isProcessingFile}>
              {isProcessingFile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
              Processar Arquivo
            </Button>
          </CardFooter>
        </Card>
      )}

      <Card className="w-full">
        <CardHeader>
          <CardTitle>{isUserAdmin() ? "Criação de Controle Individual" : pageTitle}</CardTitle>
          <CardDescription>{pageDescription}</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="w-full">
          <CardContent className="space-y-4">
            {isUserAdmin() ? (
              <>
                <div>
                  <Label htmlFor="controlId">ID do Controle</Label>
                  <Input id="controlId" {...register("controlId")} placeholder="Ex: FIN-010, IT-ABC" />
                  {errors.controlId && <p className="text-sm text-destructive mt-1">{(errors.controlId as any).message}</p>}
                </div>
                <div>
                  <Label htmlFor="controlName">Nome do Controle</Label>
                  <Input id="controlName" {...register("controlName")} placeholder="Nome conciso e claro" />
                  {errors.controlName && <p className="text-sm text-destructive mt-1">{(errors.controlName as any).message}</p>}
                </div>
                <div>
                  <Label htmlFor="description">Descrição Completa do Controle</Label>
                  <Textarea id="description" {...register("description")} placeholder="Descreva detalhadamente o controle." rows={5} />
                  {errors.description && <p className="text-sm text-destructive mt-1">{(errors.description as any).message}</p>}
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="controlOwner">Dono do Controle</Label>
                    <Input id="controlOwner" {...register("controlOwner")} placeholder="Nome do dono" />
                    {errors.controlOwner && <p className="text-sm text-destructive mt-1">{(errors.controlOwner as any).message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="controlFrequency">Frequência</Label>
                    <Input id="controlFrequency" {...register("controlFrequency")} placeholder="Ex: Diário, Mensal, Por ocorrência" />
                    {errors.controlFrequency && <p className="text-sm text-destructive mt-1">{(errors.controlFrequency as any).message}</p>}
                  </div>
                </div>
                 <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="controlType">Tipo (P/D)</Label>
                      <Input id="controlType" {...register("controlType")} placeholder="Ex: Preventivo, Detectivo" />
                      {errors.controlType && <p className="text-sm text-destructive mt-1">{(errors.controlType as any).message}</p>}
                    </div>
                    <div>
                      <Label htmlFor="modalidade">Modalidade</Label>
                      <Input id="modalidade" {...register("modalidade")} placeholder="Ex: Manual, Automático, Híbrido" />
                      {errors.modalidade && <p className="text-sm text-destructive mt-1">{(errors.modalidade as any).message}</p>}
                    </div>
                 </div>
                 <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="processo">Processo</Label>
                      <Input id="processo" {...register("processo")} placeholder="Ex: Ativo Fixo" />
                      {errors.processo && <p className="text-sm text-destructive mt-1">{(errors.processo as any).message}</p>}
                    </div>
                    <div>
                      <Label htmlFor="subProcesso">Subprocesso</Label>
                      <Input id="subProcesso" {...register("subProcesso")} placeholder="Ex: Gestão de Projetos" />
                      {errors.subProcesso && <p className="text-sm text-destructive mt-1">{(errors.subProcesso as any).message}</p>}
                    </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="responsavel">Responsável</Label>
                      <Input id="responsavel" {...register("responsavel")} placeholder="Nome do responsável pela execução" />
                      {errors.responsavel && <p className="text-sm text-destructive mt-1">{(errors.responsavel as any).message}</p>}
                    </div>
                    <div>
                      <Label htmlFor="n3Responsavel">N3 Responsável</Label>
                      <Input id="n3Responsavel" {...register("n3Responsavel")} placeholder="Nome do gestor N3" />
                      {errors.n3Responsavel && <p className="text-sm text-destructive mt-1">{(errors.n3Responsavel as any).message}</p>}
                    </div>
                </div>
                <div>
                  <Label htmlFor="relatedRisks">Riscos Relacionados (separados por vírgula)</Label>
                  <Input id="relatedRisks" {...register("relatedRisks")} placeholder="Risco A, Risco B" />
                </div>
                <div>
                  <Label htmlFor="testProcedures">Procedimentos de Teste</Label>
                  <Textarea id="testProcedures" {...register("testProcedures")} placeholder="Descreva os procedimentos de teste." rows={3} />
                </div>
              </>
            ) : (
              <> {/* Campos SIMPLIFICADOS para Dono do Controle */}
                <div>
                  <Label htmlFor="controlName">Nome do Controle</Label>
                  <Input id="controlName" {...register("controlName")} placeholder="Nome conciso e claro para o controle" />
                  {errors.controlName && <p className="text-sm text-destructive mt-1">{(errors.controlName as any).message}</p>}
                </div>
                <div>
                  <Label htmlFor="justificativa">Descrição / Justificativa do Controle</Label>
                  <Textarea
                    id="justificativa"
                    {...register("justificativa")}
                    placeholder="Descreva o objetivo do controle, como ele funciona e por que ele é necessário."
                    rows={5}
                  />
                  {errors.justificativa && <p className="text-sm text-destructive mt-1">{(errors.justificativa as any).message}</p>}
                </div>
              </>
            )}
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isUserAdmin() ? "Criar Controle" : "Enviar Proposta para Análise"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
