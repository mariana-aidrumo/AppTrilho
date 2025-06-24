// src/app/new-control/page.tsx
"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Download, FileUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserProfile } from '@/contexts/user-profile-context';
import { addSoxControlsInBulk } from '@/services/sox-service';
import type { SoxControl } from '@/types';
import Link from 'next/link';
import * as xlsx from 'xlsx';
import { parseSharePointBoolean } from '@/lib/sharepoint-utils';

export default function NewControlPage() {
  const { toast } = useToast();
  const { isUserAdmin } = useUserProfile();
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  if (!isUserAdmin()) {
    return (
      <div className="space-y-6 w-full max-w-4xl mx-auto">
        <div className="flex items-center">
            <Button variant="outline" asChild>
            <Link href="/sox-matrix">
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Painel
            </Link>
            </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Esta funcionalidade está disponível apenas para Administradores de Controles Internos.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const headerMapping: { [key: string]: keyof SoxControl | string } = {
    "Cód Controle ANTERIOR": "codigoAnterior",
    "Matriz": "matriz",
    "Processo": "processo",
    "Sub-Processo": "subProcesso",
    "Risco": "riscoId",
    "Descrição do Risco": "riscoDescricao",
    "Classificação do Risco": "riscoClassificacao",
    "Codigo NOVO": "controlId", // Note: "Código" changed to "Codigo" to match user's latest screenshot implicitly
    "Codigo COSAN": "codigoCosan", // Note: "Código" changed to "Codigo" to match user's latest screenshot implicitly
    "Objetivo do Controle": "objetivoControle",
    "Nome do Controle": "controlName",
    "Descrição do controle ATUAL": "description",
    "Tipo": "tipo",
    "Frequência": "controlFrequency",
    "Modalidade": "modalidade",
    "P/D": "controlType",
    "MRC?": "mrc",
    "Evidência do controle": "evidenciaControle",
    "Implementação": "implementacaoData", // Changed from "Implementação Data" to match user list
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
    "Dono do Controle (Control owner)": "controlOwner",
    "Executor do Controle": "executorControle",
    "Executado por": "executadoPor",
    "N3 Responsável": "n3Responsavel",
    "Área": "area",
    "VP Responsável": "vpResponsavel",
    "Impacto Malha Sul": "impactoMalhaSul",
    "Sistema Armazenamento": "sistemaArmazenamento",
  };
  
  const handleDownloadTemplate = () => {
    // Recreate headers in the exact order specified by the user
    const orderedHeaders = [
      "Cód Controle ANTERIOR", "Matriz", "Processo", "Sub-Processo", "Risco", "Descrição do Risco",
      "Classificação do Risco", "Codigo NOVO", "Codigo COSAN", "Objetivo do Controle", "Nome do Controle",
      "Descrição do controle ATUAL", "Tipo", "Frequência", "Modalidade", "P/D", "MRC?", "Evidência do controle",
      "Implementação", "Data última alteração", "Sistemas Relacionados", "Transações/Telas/Menus críticos",
      "Aplicável IPE?", "C", "E/O", "V/A", "O/R", "P/D (IPE)", "Responsável", "Dono do Controle (Control owner)",
      "Executor do Controle", "Executado por", "N3 Responsável", "Área", "VP Responsável", "Impacto Malha Sul",
      "Sistema Armazenamento"
    ];
    const ws = xlsx.utils.json_to_sheet([{}], { header: orderedHeaders });
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
              if (headerMapping[key as keyof typeof headerMapping]) {
                  const mappedKey = headerMapping[key as keyof typeof headerMapping]
                  if(typeof mappedKey === 'string') {
                     mappedRow[mappedKey] = row[key];
                  }
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
              mrc: parseSharePointBoolean(mappedRow.mrc),
              evidenciaControle: mappedRow.evidenciaControle,
              implementacaoData: mappedRow.implementacaoData,
              dataUltimaAlteracao: mappedRow.dataUltimaAlteracao,
              sistemasRelacionados: mappedRow.sistemasRelacionados ? String(mappedRow.sistemasRelacionados).split(',').map(r => r.trim()) : [],
              transacoesTelasMenusCriticos: mappedRow.transacoesTelasMenusCriticos,
              aplicavelIPE: parseSharePointBoolean(mappedRow.aplicavelIPE),
              ipe_C: parseSharePointBoolean(mappedRow.ipe_C),
              ipe_EO: parseSharePointBoolean(mappedRow.ipe_EO),
              ipe_VA: parseSharePointBoolean(mappedRow.ipe_VA),
              ipe_OR: parseSharePointBoolean(mappedRow.ipe_OR),
              ipe_PD: parseSharePointBoolean(mappedRow.ipe_PD),
              executorControle: mappedRow.executorControle ? String(mappedRow.executorControle).split(';').map(r => r.trim()) : [],
              executadoPor: mappedRow.executadoPor,
              area: mappedRow.area,
              vpResponsavel: mappedRow.vpResponsavel,
              impactoMalhaSul: parseSharePointBoolean(mappedRow.impactoMalhaSul),
              sistemaArmazenamento: mappedRow.sistemaArmazenamento,
            };
            controlsToCreate.push(newSoxControl);
          }
        });
        
        if (controlsToCreate.length > 0) {
            const { controlsAdded, errors } = await addSoxControlsInBulk(controlsToCreate);

            if (errors.length > 0) {
                const firstError = errors[0];
                const detailedErrorMessage = `Controle '${firstError.controlId || "ID não encontrado"}': ${firstError.message}`;

                toast({
                  title: `Falha na Importação (${errors.length} erro${errors.length > 1 ? 's' : ''})`,
                  description: detailedErrorMessage,
                  variant: "destructive",
                  duration: 15000 
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

        setExcelFile(null);
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

  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto">
      <div className="flex items-center">
        <Button variant="outline" asChild>
          <Link href="/sox-matrix">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para o Painel
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Adicionar Novos Controles</CardTitle>
          <CardDescription>Para adicionar controles, baixe o modelo, preencha e faça o upload.</CardDescription>
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
    </div>
  );
}
