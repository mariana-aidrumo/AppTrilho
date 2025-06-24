
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
import { addChangeRequest, addSoxControl, addSoxControlsInBulk } from '@/services/sox-service';
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

    try {
      if (isUserAdmin()) {
        const adminData = data as AdminFormValues;
        const newSoxControl: Partial<SoxControl> = {
          controlId: adminData.controlId,
          controlName: adminData.controlName,
          description: adminData.description,
          controlOwner: adminData.controlOwner || "",
          controlFrequency: adminData.controlFrequency as any || "Ad-hoc",
          controlType: adminData.controlType as any || "Preventivo",
          relatedRisks: adminData.relatedRisks ? adminData.relatedRisks.split(',').map(r => r.trim()) : [],
          testProcedures: adminData.testProcedures || "",
          processo: adminData.processo,
          subProcesso: adminData.subProcesso,
          modalidade: adminData.modalidade as any,
          responsavel: adminData.responsavel,
          n3Responsavel: adminData.n3Responsavel,
        };
        
        await addSoxControl(newSoxControl);
        
        toast({
          title: "Controle Criado!",
          description: `O controle "${adminData.controlName}" foi criado com sucesso.`,
          variant: "default",
        });

      } else {
        const ownerData = data as OwnerFormValues;
        const tempProposedId = `TEMP-${Date.now()}`;

        const newChangeRequest: Partial<ChangeRequest> = {
          controlId: `NEW-CTRL-${tempProposedId.toUpperCase().replace(/\s+/g, '-')}`,
          requestedBy: currentUser.name,
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
        await addChangeRequest(newChangeRequest);
        toast({
          title: "Proposta Enviada!",
          description: `Sua proposta para o controle "${ownerData.controlName}" foi enviada para aprovação.`,
          variant: "default",
        });
      }
      reset();
    } catch(error) {
        toast({
            title: "Erro ao Salvar",
            description: "Não foi possível salvar os dados. Tente novamente.",
            variant: "destructive"
        });
        console.error("Failed to submit new control/request:", error);
    }
  };
  
  const headerMapping: { [key: string]: keyof SoxControl | string } = {
    "Cód Controle ANTERIOR": "codigoAnterior",
    "Processo": "processo",
    "Sub-Processo": "subProcesso",
    "Código NOVO": "controlId",
    "Nome do Controle": "controlName",
    "Descrição do controle ATUAL": "description",
    "Frequência": "controlFrequency",
    "Modalidade": "modalidade",
    "P/D": "controlType",
    "Dono do Controle (Control owner)": "controlOwner",
    "Matriz": "matriz",
    "Risco": "riscoId",
    "Descrição do Risco": "riscoDescricao",
    "Classificação do Risco": "riscoClassificacao",
    "Código COSAN": "codigoCosan",
    "Objetivo do Controle": "objetivoControle",
    "Tipo": "tipo",
    "MRC?": "mrc",
    "Evidência do controle": "evidenciaControle",
    "Implementação Data": "implementacaoData",
    "Data última alteração": "dataUltimaAlteracao",
    "Sistemas Relacionados": "sistemasRelacionados",
    "Transações/Telas/Menus críticos": "transacoesTelasMenusCriticos",
    "Aplicável IPE?": "aplicavelIPE",
    "C": "ipe_C",
    "E/O": "ipe_EO",
    "V/A": "ipe_VA",
    "O/R": "ipe_OR",
    "P/D (IPE)": "ipe_PD",
    "Responsável": "responsavel",
    "Executor do Controle": "executorControle",
    "Executado por": "executadoPor",
    "N3 Responsável": "n3Responsavel",
    "Área": "area",
    "VP Responsável": "vpResponsavel",
    "Impacto Malha Sul": "impactoMalhaSul",
    "Sistema Armazenamento": "sistemaArmazenamento",
  };

  const handleDownloadTemplate = () => {
    const headers = Object.keys(headerMapping);
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
      reader.onload = async (event) => {
        const data = event.target?.result;
        const workbook = xlsx.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonFromSheet: any[] = xlsx.utils.sheet_to_json(worksheet, { defval: "" });

        const controlsToCreate: Partial<SoxControl>[] = [];
        jsonFromSheet.forEach((row) => {
          const mappedRow: any = {};
          for (const key in row) {
              if (headerMapping[key]) {
                  mappedRow[headerMapping[key]] = row[key];
              }
          }
          
          if (mappedRow.controlId && mappedRow.controlName && mappedRow.description) {
             const newSoxControl: Partial<SoxControl> = {
              controlId: mappedRow.controlId,
              controlName: mappedRow.controlName,
              description: mappedRow.description,
              controlOwner: mappedRow.controlOwner,
              controlFrequency: mappedRow.controlFrequency,
              controlType: mappedRow.controlType,
              processo: mappedRow.processo,
              subProcesso: mappedRow.subProcesso,
              modalidade: mappedRow.modalidade,
              responsavel: mappedRow.responsavel,
              n3Responsavel: mappedRow.n3Responsavel,
              codigoAnterior: mappedRow.codigoAnterior,
              matriz: mappedRow.matriz,
              riscoId: mappedRow.riscoId,
              riscoDescricao: mappedRow.riscoDescricao,
              riscoClassificacao: mappedRow.riscoClassificacao,
              codigoCosan: mappedRow.codigoCosan,
              objetivoControle: mappedRow.objetivoControle,
              tipo: mappedRow.tipo,
              mrc: parseBoolean(mappedRow.mrc),
              evidenciaControle: mappedRow.evidenciaControle,
              implementacaoData: mappedRow.implementacaoData,
              dataUltimaAlteracao: mappedRow.dataUltimaAlteracao,
              sistemasRelacionados: mappedRow.sistemasRelacionados ? String(mappedRow.sistemasRelacionados).split(',').map(r => r.trim()) : [],
              transacoesTelasMenusCriticos: mappedRow.transacoesTelasMenusCriticos,
              aplicavelIPE: parseBoolean(mappedRow.aplicavelIPE),
              ipeAssertions: {
                  C: parseBoolean(mappedRow.ipe_C),
                  EO: parseBoolean(mappedRow.ipe_EO),
                  VA: parseBoolean(mappedRow.ipe_VA),
                  OR: parseBoolean(mappedRow.ipe_OR),
                  PD: parseBoolean(mappedRow.ipe_PD),
              },
              executorControle: mappedRow.executorControle ? String(mappedRow.executorControle).split(';').map(r => r.trim()) : [],
              executadoPor: mappedRow.executadoPor,
              area: mappedRow.area,
              vpResponsavel: mappedRow.vpResponsavel,
              impactoMalhaSul: parseBoolean(mappedRow.impactoMalhaSul),
              sistemaArmazenamento: mappedRow.sistemaArmazenamento,
            };
            controlsToCreate.push(newSoxControl);
          }
        });
        
        if (controlsToCreate.length > 0) {
            const { controlsAdded, errors } = await addSoxControlsInBulk(controlsToCreate);

            if (errors.length > 0) {
                const errorSummary = `Falha ao importar ${errors.length} controle(s). Verifique se os valores de colunas de 'Escolha' (Ex: Frequência, Tipo) correspondem exatamente às opções no SharePoint.`;
                toast({
                  title: `Importação Parcial: ${controlsAdded}/${jsonFromSheet.length} sucesso(s)`,
                  description: errorSummary,
                  variant: "destructive",
                  duration: 9000
                });
                console.error("Erros de importação:", errors);
            } else {
                toast({
                  title: "Arquivo Processado!",
                  description: `${controlsAdded} de ${jsonFromSheet.length} controles foram importados com sucesso.`,
                });
            }
        } else {
            toast({
              title: "Nenhum controle válido encontrado",
              description: "Verifique se a planilha está preenchida corretamente com ID, Nome e Descrição.",
              variant: "destructive"
            });
        }

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
