'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SoxControl } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, FileEdit, History, ChevronRight, Filter, RotateCcw, Search } from "lucide-react";
import Link from "next/link";

// Dados mocados para demonstração
const mockControls: SoxControl[] = [
  {
    id: "1",
    controlId: "FIN-001",
    controlName: "Revisão de Conciliação Bancária",
    description: "Revisão mensal e aprovação das conciliações bancárias.",
    controlOwner: "Alice Wonderland",
    controlFrequency: "Mensal",
    controlType: "Detectivo", // Usado para P/D
    status: "Ativo",
    lastUpdated: new Date().toISOString(),
    relatedRisks: ["Demonstração Financeira Incorreta"],
    testProcedures: "Verificar assinatura da conciliação.",
    evidenceRequirements: "Relatório de conciliação bancária assinado.",
    processo: "Relatórios Financeiros",
    subProcesso: "Fechamento Mensal",
    modalidade: "Manual",
  },
  {
    id: "2",
    controlId: "ITG-005",
    controlName: "Aprovação de Acesso ao Sistema",
    description: "Revisão trimestral dos direitos de acesso do usuário a sistemas críticos.",
    controlOwner: "Bob The Builder",
    controlFrequency: "Por Solicitação",
    controlType: "Preventivo", // Usado para P/D
    status: "Ativo",
    lastUpdated: new Date().toISOString(),
    relatedRisks: ["Acesso Não Autorizado", "Violação de Dados"],
    testProcedures: "Amostra de logs de acesso do usuário e comparação com funções aprovadas.",
    evidenceRequirements: "Documentação de revisão de acesso do usuário com aprovações.",
    processo: "Gerenciamento de Acesso de Usuário",
    subProcesso: "Provisionamento de Usuário",
    modalidade: "Automático",
  },
   {
    id: "3",
    controlId: "PRO-012",
    controlName: "Due Diligence de Integridade",
    description: "Contagens cíclicas regulares de estoque para garantir a precisão.",
    controlOwner: "Charlie Brown",
    controlFrequency: "Por Novo Fornecedor",
    controlType: "Preventivo", // Usado para P/D
    status: "Pendente Aprovação",
    lastUpdated: new Date().toISOString(),
    relatedRisks: ["Perda de Estoque", "Erros de Avaliação de Estoque"],
    testProcedures: "Realizar contagens cíclicas e investigar discrepâncias.",
    evidenceRequirements: "Folhas de contagem cíclica e relatórios de ajuste.",
    processo: "Compras",
    subProcesso: "Gerenciamento de Fornecedores",
    modalidade: "Manual",
  },
];

// Mock data for filters
const mockProcessos = ["Todos", "Relatórios Financeiros", "Gerenciamento de Acesso de Usuário", "Compras"];
const mockSubProcessos = ["Todos", "Fechamento Mensal", "Provisionamento de Usuário", "Gerenciamento de Fornecedores"];
const mockDonos = ["Todos", "Alice Wonderland", "Bob The Builder", "Charlie Brown"];


export default function SoxMatrixPage() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">Minhas Solicitações Pendentes</CardTitle>
            <FileEdit className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Visualize e gerencie suas solicitações de mudança ou criação.
            </p>
            <Button variant="outline" size="sm" className="mt-3 w-full" asChild>
              <Link href="/pending-approvals">Ver Solicitações</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">Propor Novo Controle</CardTitle>
            <Link href="/new-control"><FileEdit className="h-5 w-5 text-primary cursor-pointer" /></Link>
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
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">Ver Histórico da Matriz</CardTitle>
             <Link href="/matrix-history"><History className="h-5 w-5 text-primary cursor-pointer" /></Link>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Veja o histórico geral de versões da matriz SOX.
            </p>
             <Button variant="outline" size="sm" className="mt-3 w-full" asChild>
              <Link href="/matrix-history">Ver Histórico</Link>
            </Button>
          </CardContent>
        </Card>
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
                  {mockProcessos.map(p => <SelectItem key={p} value={p.toLowerCase()}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="subprocesso" className="text-sm font-medium text-muted-foreground">Subprocesso</label>
              <Select>
                <SelectTrigger id="subprocesso"><SelectValue placeholder="Selecionar Subprocesso" /></SelectTrigger>
                <SelectContent>
                  {mockSubProcessos.map(s => <SelectItem key={s} value={s.toLowerCase()}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="dono" className="text-sm font-medium text-muted-foreground">Dono do Controle</label>
              <Select>
                <SelectTrigger id="dono"><SelectValue placeholder="Selecionar Dono" /></SelectTrigger>
                <SelectContent>
                  {mockDonos.map(d => <SelectItem key={d} value={d.toLowerCase()}>{d}</SelectItem>)}
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
          <CardTitle>Matriz de Controles SOX</CardTitle>
          <CardDescription>
            Visualize os controles SOX. Clique em um ID de controle para mais detalhes.
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
                {mockControls.map((control) => (
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
                        "bg-gray-100 text-gray-700"
                       }`}>
                        {control.modalidade}
                       </span>
                    </TableCell>
                    <TableCell>{control.controlType}</TableCell> {/* Usando controlType como P/D */}
                    <TableCell>{control.controlOwner}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-1">
                        <Button variant="ghost" size="icon" asChild title="Ver Detalhes">
                          <Link href={`/controls/${control.id}`}><Eye className="h-4 w-4" /></Link>
                        </Button>
                        <Button variant="ghost" size="icon" title="Editar">
                           <Link href={`/controls/${control.id}`}><FileEdit className="h-4 w-4" /></Link>
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
          {mockControls.length === 0 && (
            <p className="mt-4 text-center text-muted-foreground">Nenhum controle encontrado.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
