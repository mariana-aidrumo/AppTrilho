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
            Esta página lista todas as colunas disponíveis na sua lista do SharePoint `lista-acessos`. Utilize esta informação para resolvermos o problema de login.
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

      <Card className="bg-amber-50 border-amber-300">
          <CardHeader>
            <CardTitle className="text-amber-900">Ação Necessária: Me ajude a corrigir o Login</CardTitle>
          </CardHeader>
          <CardContent className="text-amber-800 space-y-2">
            <p>O problema de login acontece porque os nomes internos das colunas no SharePoint são diferentes do que esperamos. A tabela acima nos mostra os nomes corretos.</p>
            <p>Por favor, siga estes 2 passos:</p>
            <ul className="list-decimal pl-6 space-y-1">
                <li>Encontre na tabela acima as linhas correspondentes ao **e-mail do usuário**, à permissão de **dono de controle** e à permissão de **administrador**.</li>
                <li>Me informe quais são os valores exatos da coluna **"Nome Interno (para o código)"** para esses três campos.</li>
            </ul>
            <p className="mt-2"><b>Exemplo de como me responder:</b> <br /> <code className="bg-amber-200 px-1 rounded-sm">"Ok, para e-mail use 'field_2', para dono de controle use 'field_3' e para admin use 'field_4'."</code></p>
            <p>Com essa informação, farei a correção final e o login funcionará.</p>
          </CardContent>
      </Card>
    </div>
  );
}
