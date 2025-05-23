
// src/app/sox-matrix/page.tsx
'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SoxControl } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, FileEdit, History, ChevronRight, Filter, RotateCcw, Search, CheckSquare, FilePlus2, ListChecks } from "lucide-react";
import Link from "next/link";
import { useUserProfile } from "@/contexts/user-profile-context";
import { mockSoxControls, mockProcessos, mockSubProcessos, mockDonos } from "@/data/mock-data";

export default function SoxMatrixPage() {
  const { currentUser, isUserAdmin, isUserControlOwner } = useUserProfile();

  const pageTitle = isUserControlOwner() ? "Meus Controles" : "Painel da Matriz SOX";
  
  const displayedControls = isUserControlOwner() 
    ? mockSoxControls.filter(control => currentUser.controlsOwned?.includes(control.id))
    : mockSoxControls;

  return (
    <div className="space-y-6">
      {/* Cards de Ação Condicionais */}
      <div className={`grid grid-cols-1 gap-6 mb-6 ${isUserAdmin() ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
        {isUserAdmin() && (
          <>
            <Card className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">Aprovações Pendentes</CardTitle>
                <Link href="/pending-approvals"><CheckSquare className="h-5 w-5 text-primary cursor-pointer" /></Link>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Revise todas as solicitações de mudança ou criação.
                </p>
                <Button variant="outline" size="sm" className="mt-3 w-full" asChild>
                  <Link href="/pending-approvals">Ver Aprovações</Link>
                </Button>
              </CardContent>
            </Card>
            <Card className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">Propor Novo Controle</CardTitle>
                <Link href="/new-control"><FilePlus2 className="h-5 w-5 text-primary cursor-pointer" /></Link>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Crie e envie um novo controle SOX para o sistema.
                </p>
                <Button variant="outline" size="sm" className="mt-3 w-full" asChild>
                  <Link href="/new-control">Propor Controle</Link>
                </Button>
              </CardContent>
            </Card>
            <Card className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">Ver Histórico da Matriz</CardTitle>
                <Link href="/matrix-history"><History className="h-5 w-5 text-primary cursor-pointer" /></Link>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Acesse o histórico completo de versões da matriz SOX.
                </p>
                <Button variant="outline" size="sm" className="mt-3 w-full" asChild>
                  <Link href="/matrix-history">Ver Histórico</Link>
                </Button>
              </CardContent>
            </Card>
          </>
        )}
        {isUserControlOwner() && (
          <>
            <Card className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">Minhas Solicitações</CardTitle>
                 <Link href="/pending-approvals"><ListChecks className="h-5 w-5 text-primary cursor-pointer" /></Link>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Visualize suas solicitações de mudança ou criação de controles.
                </p>
                <Button variant="outline" size="sm" className="mt-3 w-full" asChild>
                  <Link href="/pending-approvals">Ver Solicitações</Link>
                </Button>
              </CardContent>
            </Card>
            <Card className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">Propor Novo Controle</CardTitle>
                <Link href="/new-control"><FilePlus2 className="h-5 w-5 text-primary cursor-pointer" /></Link>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Envie uma proposta para um novo controle SOX.
                </p>
                <Button variant="outline" size="sm" className="mt-3 w-full" asChild>
                  <Link href="/new-control">Propor Controle</Link>
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl">Filtrar Controles</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="md:col-span-1">
              <label htmlFor="searchControl" className="text-sm font-medium text-muted-foreground">Pesquisar Controle</label>
              <div className="relative">
                <Input id="searchControl" placeholder="Código, Nome, Descrição..." className="pr-10" />
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
            <div>
              <label htmlFor="processo" className="text-sm font-medium text-muted-foreground">Processo</label>
              <Select>
                <SelectTrigger id="processo"><SelectValue placeholder="Selecionar Processo" /></SelectTrigger>
                <SelectContent>
                  {mockProcessos.map(p => <SelectItem key={p} value={p.toLowerCase().replace(/\s+/g, '-')}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="subprocesso" className="text-sm font-medium text-muted-foreground">Subprocesso</label>
              <Select>
                <SelectTrigger id="subprocesso"><SelectValue placeholder="Selecionar Subprocesso" /></SelectTrigger>
                <SelectContent>
                  {mockSubProcessos.map(s => <SelectItem key={s} value={s.toLowerCase().replace(/\s+/g, '-')}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="dono" className="text-sm font-medium text-muted-foreground">Dono do Controle</label>
              <Select>
                <SelectTrigger id="dono"><SelectValue placeholder="Selecionar Dono" /></SelectTrigger>
                <SelectContent>
                  {mockDonos.map(d => <SelectItem key={d} value={d.toLowerCase().replace(/\s+/g, '-')}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline">
              <RotateCcw className="mr-2 h-4 w-4" /> Limpar Filtros
            </Button>
            <Button className="bg-primary hover:bg-primary/90">
              <Filter className="mr-2 h-4 w-4" /> Aplicar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>{pageTitle}</CardTitle>
          <CardDescription>
            {isUserControlOwner()
              ? "Visualize os controles SOX pelos quais você é responsável."
              : "Visualize todos os controles SOX. Clique em um ID de controle para mais detalhes."}
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                  <TableHead>Dono</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedControls.map((control) => (
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
                    <TableCell>{control.controlOwner}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-1">
                        <Button variant="ghost" size="icon" asChild title="Ver Detalhes">
                          <Link href={`/controls/${control.id}`}><Eye className="h-4 w-4" /></Link>
                        </Button>
                        {(isUserAdmin() || (isUserControlOwner() && currentUser.controlsOwned?.includes(control.id))) && (
                           <Button variant="ghost" size="icon" asChild title="Solicitar Alteração / Editar">
                             <Link href={`/controls/${control.id}?edit=true`}><FileEdit className="h-4 w-4" /></Link>
                           </Button>
                        )}
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
          {displayedControls.length === 0 && (
            <p className="mt-4 text-center text-muted-foreground">
              {isUserControlOwner() ? "Você não possui nenhum controle atribuído." : "Nenhum controle encontrado."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

