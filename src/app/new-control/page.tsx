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
import { addSoxControlsInBulk, appToSpDisplayNameMapping } from '@/services/sox-service';
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

  // This mapping connects the app's internal SoxControl type properties to the Excel header names.
  // It now uses the centralized mapping from the service as the source of truth.
  const appKeyToExcelHeader: { [key: string]: string } = {};
  const excelHeaderToAppKey: { [key: string]: string } = {};
  for(const key in appToSpDisplayNameMapping) {
      const appKey = key as keyof SoxControl;
      const excelHeader = (appToSpDisplayNameMapping as any)[appKey];
      appKeyToExcelHeader[appKey] = excelHeader;
      excelHeaderToAppKey[excelHeader] = appKey;
  }
  
  const handleDownloadTemplate = () => {
    // These headers MUST match the display names in SharePoint.
    const orderedHeaders = Object.values(appToSpDisplayNameMapping);
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
        const workbook = xlsx.read(data, { type: 'binary', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonFromSheet: any[] = xlsx.utils.sheet_to_json(worksheet, { defval: "", raw: false });

        const controlsToCreate: Partial<SoxControl>[] = [];
        for (const row of jsonFromSheet) {
          const mappedRow: Partial<SoxControl> = {};
          for (const excelHeader in row) {
            if (Object.prototype.hasOwnProperty.call(excelHeaderToAppKey, excelHeader)) {
              const appKey = excelHeaderToAppKey[excelHeader] as keyof SoxControl;
              const rawValue = row[excelHeader];
              
              // Parse boolean-like fields consistently
              const booleanFields: (keyof SoxControl)[] = ['mrc', 'aplicavelIPE', 'ipe_C', 'ipe_EO', 'ipe_VA', 'ipe_OR', 'ipe_PD', 'impactoMalhaSul'];
              if (booleanFields.includes(appKey)) {
                (mappedRow as any)[appKey] = parseSharePointBoolean(rawValue);
              } 
              // Parse array-like fields
              else if (appKey === 'sistemasRelacionados' || appKey === 'executorControle') {
                 (mappedRow as any)[appKey] = typeof rawValue === 'string' ? String(rawValue).split(/[,;]/).map(s => s.trim()) : [];
              }
              // Keep other values as they are (string, number, date)
              else {
                (mappedRow as any)[appKey] = rawValue;
              }
            }
          }
          
          if (mappedRow.controlId || mappedRow.controlName) {
            controlsToCreate.push(mappedRow);
          }
        }
        
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
              description: "Verifique se a planilha está preenchida corretamente e possui as colunas necessárias.",
              variant: "destructive"
            });
        }

        setExcelFile(null);
        const fileInput = document.getElementById('excel-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
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
