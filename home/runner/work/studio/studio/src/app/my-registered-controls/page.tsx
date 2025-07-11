
// src/app/my-registered-controls/page.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import { useUserProfile } from "@/contexts/user-profile-context";
import { getSoxControls } from "@/services/sox-service";
import type { SoxControl } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ShieldCheck, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from 'next/link';

export default function MyRegisteredControlsPage() {
  const { currentUser, isUserControlOwner } = useUserProfile();
  const [allControls, setAllControls] = useState<SoxControl[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isUserControlOwner()) {
      const fetchControls = async () => {
        try {
          const data = await getSoxControls();
          setAllControls(data);
        } catch (err: any) {
          console.error("Failed to load controls:", err);
          // Handle error appropriately, maybe a toast
        } finally {
          setIsLoading(false);
        }
      };
      fetchControls();
    } else {
        setIsLoading(false);
    }
  }, [isUserControlOwner]);

  const myControls = useMemo(() => {
    if (!currentUser) return [];
    // Assuming the current user's name is the identifier in the 'controlOwner' field.
    // This might need adjustment if it's based on email or ID.
    return allControls.filter(
      (control) => control.controlOwner === currentUser.name
    );
  }, [allControls, currentUser]);

  if (!isUserControlOwner()) {
    return (
      <div className="space-y-6 w-full">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Esta página é destinada apenas para Donos de Controle.</p>
            <Button variant="outline" asChild className="mt-4">
              <Link href="/sox-matrix">
                <Home className="mr-2 h-4 w-4" /> Voltar ao Painel
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
            <p className="ml-2">Carregando seus controles...</p>
        </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Meus Controles Registrados</CardTitle>
          <CardDescription>
            Aqui estão todos os controles SOX sob sua responsabilidade como Dono do Controle.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código do Controle</TableHead>
                  <TableHead>Nome do Controle</TableHead>
                  <TableHead>Frequência</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myControls.length > 0 ? (
                  myControls.map(control => (
                    <TableRow key={control.id}>
                      <TableCell className="font-medium">{control.controlId}</TableCell>
                      <TableCell>{control.controlName}</TableCell>
                      <TableCell>{control.controlFrequency}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          control.status === "Ativo" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                        }`}>
                            {control.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      Você ainda não é dono de nenhum controle.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
