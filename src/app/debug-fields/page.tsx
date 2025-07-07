// src/app/debug-fields/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useUserProfile } from "@/contexts/user-profile-context";
import { getHistoryListColumns } from "@/services/sox-service";
import type { SharePointColumn } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertTriangle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function DebugFieldsPage() {
  const { isUserAdmin } = useUserProfile();
  const [columns, setColumns] = useState<SharePointColumn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isUserAdmin()) {
      const fetchColumns = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const data = await getHistoryListColumns();
          setColumns(data);
        } catch (err: any) {
          setError(err.message || "Ocorreu um erro desconhecido.");
        } finally {
          setIsLoading(false);
        }
      };
      fetchColumns();
    } else {
      setIsLoading(false);
    }
  }, [isUserAdmin]);

  if (!isUserAdmin()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Acesso Negado</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Esta página é destinada apenas para Administradores de Controles Internos.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
       <div className="flex items-center">
        <Button variant="outline" asChild>
          <Link href="/sox-matrix">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Painel
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Diagnóstico de Campos da Lista REGISTRO-MATRIZ</CardTitle>
          <CardDescription>
            Esta página lista todas as colunas disponíveis na sua lista do SharePoint `REGISTRO-MATRIZ`. Use a coluna "Nome Interno" para me informar quais campos devo usar para salvar os dados da solicitação de alteração.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="ml-2">Buscando colunas do SharePoint...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center p-8 text-destructive">
              <AlertTriangle className="h-8 w-8" />
              <p className="mt-2 font-semibold">Falha ao buscar colunas</p>
              <p className="text-sm text-center">{error}</p>
            </div>
          )}

          {!isLoading && !error && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Nome de Exibição</TableHead>
                    <TableHead className="font-bold">Nome Interno (para o código)</TableHead>
                    <TableHead>Tipo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {columns.map(col => (
                    <TableRow key={col.internalName}>
                      <TableCell>{col.displayName}</TableCell>
                      <TableCell className="font-mono bg-muted/50">{col.internalName}</TableCell>
                      <TableCell className="capitalize">{col.type}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
       <Card className="bg-amber-50 border-amber-300">
          <CardHeader>
            <CardTitle className="text-amber-900">Próximos Passos</CardTitle>
          </CardHeader>
          <CardContent className="text-amber-800 space-y-2">
            <p>1. Observe a lista acima e encontre os nomes internos para os campos onde devemos salvar:</p>
            <ul className="list-disc pl-6 space-y-1">
                <li>O nome do campo que está sendo alterado (ex: "Nome do Controle")</li>
                <li>O novo valor para esse campo (ex: "Novo Nome do Controle")</li>
            </ul>
            <p>2. Me diga quais são os "Nomes Internos" corretos. Por exemplo: <br /> <code className="bg-amber-200 px-1 rounded-sm">"Ok, para o nome do campo use 'field_13' e para o novo valor use 'field_14'"</code>.</p>
            <p>Com essa informação, farei a correção final e definitiva.</p>
          </CardContent>
      </Card>
    </div>
  );
}
