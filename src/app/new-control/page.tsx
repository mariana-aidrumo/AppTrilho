
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
import { addSoxControlsInBulk, getSharePointColumnDetails } from '@/services/sox-service';
import Link from 'next/link';
import * as xlsx from 'xlsx';

export default function NewControlPage() {
  const { toast } = useToast();
  const { isUserAdmin } = useUserProfile();
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

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

  const handleDownloadTemplate = async () => {
    setIsDownloading(true);
    toast({ title: "Preparando download...", description: "Buscando os cabeçalhos mais recentes do SharePoint." });
    try {
      // Dynamically fetch the current headers from SharePoint
      const columns = await getSharePointColumnDetails();
      const headers = columns.map(col => col.displayName);
      
      // Create a worksheet with only the headers by passing an empty array of data.
      const ws = xlsx.utils.json_to_sheet([], { header: headers });
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, "ModeloImportacaoControles");
      
      xlsx.writeFile(wb, "template_importacao_controles.xlsx");
      
      toast({ title: "Template Gerado!", description: "O template para importação foi exportado com sucesso." });
    } catch (error) {
      console.error("Failed to download template file:", error);
      const errorMessage = error instanceof Error ? error.message : "Não foi possível gerar o arquivo de template.";
      toast({ title: "Erro no Download", description: errorMessage, variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
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
        try {
          const data = event.target?.result;
          const workbook = xlsx.read(data, { type: 'binary', cellDates: true });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonFromSheet: any[] = xlsx.utils.sheet_to_json(worksheet, { defval: "", raw: false });

          if (jsonFromSheet.length > 0) {
              const plainObjects = JSON.parse(JSON.stringify(jsonFromSheet));
              const { controlsAdded, errors } = await addSoxControlsInBulk(plainObjects);

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
        } catch (error: any) {
            console.error("Error processing Excel file:", error);
            const errorMessage = error.message || "Ocorreu um erro ao processar a planilha. Verifique o formato.";
            toast({ title: "Erro no Processamento", description: errorMessage, variant: "destructive" });
        } finally {
            setIsProcessingFile(false);
        }
      };
      reader.onerror = () => {
          toast({ title: "Erro ao ler arquivo", description: "Não foi possível ler o arquivo selecionado.", variant: "destructive" });
          setIsProcessingFile(false);
      };
      reader.readAsBinaryString(excelFile);

    } catch (error) {
      console.error("Error setting up file reader:", error);
      toast({ title: "Erro de Configuração", description: "Ocorreu um erro ao preparar o arquivo para leitura.", variant: "destructive" });
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
          <CardTitle>Adicionar Controles em Massa</CardTitle>
          <CardDescription>Para adicionar novos controles, baixe o template com os cabeçalhos corretos, preencha-o no Excel e faça o upload do arquivo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Button onClick={handleDownloadTemplate} variant="secondary" className="w-full sm:w-auto" disabled={isDownloading}>
              {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Baixar Template
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
