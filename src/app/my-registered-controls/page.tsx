
// src/app/my-registered-controls/page.tsx
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SoxControl } from "@/types";
import { Button } from "@/components/ui/button";
import { Eye, FileEdit, ChevronRight, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useUserProfile } from "@/contexts/user-profile-context";
import { mockSoxControls } from "@/data/mock-data";

export default function MyRegisteredControlsPage() {
  const { currentUser, isUserControlOwner } = useUserProfile();

  if (!isUserControlOwner()) {
    // Idealmente, redirecionar ou mostrar uma mensagem de não autorizado
    // Por simplicidade, vamos apenas mostrar uma mensagem
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
                <CardTitle>Acesso Negado</CardTitle>
                </CardHeader>
                <CardContent>
                <p>Esta página é destinada apenas para Donos de Controle.</p>
                </CardContent>
            </Card>
      </div>
    );
  }

  const ownerControls = mockSoxControls.filter(
    control => currentUser.controlsOwned?.includes(control.id) && control.status === "Ativo"
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button variant="outline" asChild>
          <Link href="/sox-matrix">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Painel (Visão Geral)
          </Link>
        </Button>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Meus Controles Registrados</CardTitle>
          <CardDescription>
            Visualize todos os controles SOX ativos pelos quais você é responsável.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ownerControls.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Processo</TableHead>
                    <TableHead>Subprocesso</TableHead>
                    <TableHead className="w-[100px]">Código</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Frequência</TableHead>
                    <TableHead>Modalidade</TableHead>
                    <TableHead>P/D</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ownerControls.map((control) => (
                    <TableRow key={control.id}>
                      <TableCell>{control.processo}</TableCell>
                      <TableCell>{control.subProcesso}</TableCell>
                      <TableCell className="font-medium">
                        <Link href={`/controls/${control.id}`} className="text-primary hover:underline">
                          {control.controlId}
                        </Link>
                      </TableCell>
                      <TableCell>{control.controlName}</TableCell>
                      <TableCell>{control.controlFrequency}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          control.modalidade === "Manual" ? "bg-purple-100 text-purple-700" :
                          control.modalidade === "Automático" ? "bg-blue-100 text-blue-700" :
                          control.modalidade === "Híbrido" ? "bg-teal-100 text-teal-700" :
                          "bg-gray-100 text-gray-700"
                        }`}>
                          {control.modalidade}
                        </span>
                      </TableCell>
                      <TableCell>{control.controlType}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-1">
                          <Button variant="ghost" size="icon" asChild title="Ver Detalhes">
                            <Link href={`/controls/${control.id}`}><Eye className="h-4 w-4" /></Link>
                          </Button>
                          <Button variant="ghost" size="icon" asChild title="Solicitar Alteração">
                            <Link href={`/controls/${control.id}?edit=true`}><FileEdit className="h-4 w-4" /></Link>
                          </Button>
                          <Button variant="ghost" size="icon" asChild title="Navegar">
                            <Link href={`/controls/${control.id}`}><ChevronRight className="h-4 w-4" /></Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="mt-4 text-center text-muted-foreground">
              Você não possui nenhum controle registrado ativo.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
