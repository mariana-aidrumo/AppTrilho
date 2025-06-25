
// src/app/sharepoint-config/page.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useUserProfile } from '@/contexts/user-profile-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Loader2, ArrowLeft, RefreshCw, AlertTriangle } from "lucide-react";
import Link from 'next/link';
import { getSharePointColumnDetails, addSharePointColumn } from '@/services/sox-service';
import type { SharePointColumn } from '@/types';

const addColumnSchema = z.object({
  displayName: z.string().min(2, "O nome de exibição é obrigatório."),
  type: z.enum(['text', 'note', 'number', 'boolean'], { required_error: "Selecione um tipo de coluna." }),
});
type AddColumnFormValues = z.infer<typeof addColumnSchema>;

const LOCAL_STORAGE_KEY = 'visibleDetailFields';

export default function SharePointConfigPage() {
  const { isUserAdmin } = useUserProfile();
  const { toast } = useToast();
  
  const [columns, setColumns] = useState<SharePointColumn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [visibleFields, setVisibleFields] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<AddColumnFormValues>({
    resolver: zodResolver(addColumnSchema),
  });

  const fetchColumns = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
        const data = await getSharePointColumnDetails();
        setColumns(data);
        
        // After fetching, initialize visibility from localStorage or default to all visible
        try {
            const storedVisible = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (storedVisible) {
                setVisibleFields(new Set(JSON.parse(storedVisible)));
            } else {
                // Default to all visible if nothing is in storage
                const allColumnDisplayNames = new Set(data.map(c => c.displayName));
                setVisibleFields(allColumnDisplayNames);
                // And save this default state to localStorage
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(Array.from(allColumnDisplayNames)));
            }
        } catch (e) {
            console.error("Failed to parse/set visibility config from localStorage", e);
             // On error, fallback to all visible as well
            const allColumnDisplayNames = new Set(data.map(c => c.displayName));
            setVisibleFields(allColumnDisplayNames);
        }

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Falha ao carregar colunas do SharePoint.";
        toast({ title: "Erro de Integração", description: errorMessage, variant: "destructive" });
        setError(errorMessage);
    } finally {
        setIsLoading(false);
    }
  }, [toast]);

  // Load columns on mount
  useEffect(() => {
    if (isUserAdmin()) {
        fetchColumns();
    } else {
      setIsLoading(false);
    }
  }, [isUserAdmin, fetchColumns]);

  const handleVisibilityChange = (displayName: string, checked: boolean) => {
    const newVisibleFields = new Set(visibleFields);
    if (checked) {
        newVisibleFields.add(displayName);
    } else {
        newVisibleFields.delete(displayName);
    }
    setVisibleFields(newVisibleFields);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(Array.from(newVisibleFields)));
    toast({ title: "Visibilidade Atualizada", description: `A visibilidade de '${displayName}' foi salva.` });
  };

  const handleAddColumn: SubmitHandler<AddColumnFormValues> = async (data) => {
    setIsSubmitting(true);
    try {
        await addSharePointColumn(data);
        toast({
          title: "Coluna Adicionada",
          description: `A coluna '${data.displayName}' foi adicionada com sucesso ao SharePoint.`,
        });
        reset();
        fetchColumns(); // Refresh the list
    } catch(error) {
        const errorMessage = error instanceof Error ? error.message : "Não foi possível adicionar a coluna.";
        toast({ title: "Erro", description: errorMessage, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

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
            <p className="ml-2">Carregando configurações da matriz...</p>
        </div>
    );
  }

  if (error && !isLoading) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
             <AlertTriangle className="h-6 w-6" />
             Falha na Integração com o SharePoint
          </CardTitle>
          <CardDescription>
            Não foi possível carregar as colunas da matriz. Isso pode ocorrer por um erro de permissão, configuração incorreta no .env ou um problema na rede.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-semibold">Mensagem de Erro Recebida:</p>
          <pre className="mt-2 w-full whitespace-pre-wrap rounded-md bg-muted p-4 font-mono text-sm text-muted-foreground">
            <code>{error}</code>
          </pre>
          <Button onClick={fetchColumns} variant="secondary" className="mt-6">
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Adicionar Nova Coluna</CardTitle>
          <CardDescription>Adicione novos campos à sua lista de controles no SharePoint. O nome interno será gerado automaticamente.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(handleAddColumn)}>
          <CardContent className="space-y-4">
             <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="displayName">Nome de Exibição</Label>
                  <Input id="displayName" {...register("displayName")} placeholder="Ex: Justificativa" />
                  {errors.displayName && <p className="text-sm text-destructive mt-1">{errors.displayName.message}</p>}
                </div>
                <div>
                  <Label htmlFor="type">Tipo de Campo</Label>
                  <Select onValueChange={(value) => reset({ ...watch(), type: value as any })} value={watch('type')}>
                    <SelectTrigger id="type">
                        <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="text">Texto (Uma linha)</SelectItem>
                        <SelectItem value="note">Texto (Múltiplas linhas)</SelectItem>
                        <SelectItem value="number">Número</SelectItem>
                        <SelectItem value="boolean">Sim/Não</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.type && <p className="text-sm text-destructive mt-1">{errors.type.message}</p>}
                </div>
             </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
              Adicionar Coluna
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gerenciar Colunas da Matriz</CardTitle>
          <CardDescription>Controle quais campos aparecem na janela de "Informações Detalhadas" do painel principal.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome da Coluna</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Mostrar nos Detalhes?</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {columns.map(column => (
                  <TableRow key={column.internalName}>
                    <TableCell className="font-medium">{column.displayName}</TableCell>
                    <TableCell className="capitalize">{column.type}</TableCell>
                    <TableCell className="text-right">
                       <Switch
                         checked={visibleFields.has(column.displayName)}
                         onCheckedChange={(checked) => handleVisibilityChange(column.displayName, checked)}
                         aria-label={`Alternar visibilidade de ${column.displayName}`}
                       />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
