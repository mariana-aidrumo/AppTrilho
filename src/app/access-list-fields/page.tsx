// src/app/access-list-fields/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useUserProfile } from "@/contexts/user-profile-context";
import { getAccessListColumns } from "@/services/sox-service";
import type { SharePointColumn } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertTriangle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AccessListFieldsPage() {
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
          const data = await getAccessListColumns();
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
      <div className="space-y-6 w-full">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Esta página é destinada apenas para Administradores de Controles Internos.</p>
            <Button variant="outline" asChild className="mt-4">
              <Link href="/sox-matrix">
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Painel
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
        <div className="flex items-center justify-center h-screen">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="ml-2">Carregando dados da lista...</p>
        </div>
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
          <CardTitle>Campos da Lista "lista-acessos"</CardTitle>
          <CardDescription>
            Esta página lista todas as colunas disponíveis na sua lista do SharePoint `lista-acessos`. Utilize esta informação para referência e configuração.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
    </div>
  );
}