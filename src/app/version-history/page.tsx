
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function VersionHistoryPage() {
  return (
    <div className="space-y-6 w-full">
       <div className="flex items-center">
        <Button variant="outline" asChild>
          <Link href="/sox-matrix">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Painel
          </Link>
        </Button>
      </div>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Histórico de Versões Geral</CardTitle>
          <CardDescription>
            Esta página exibirá o histórico de todas as versões e alterações nos controles SOX.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Funcionalidade em desenvolvimento.</p>
          {/* Aqui viria a tabela ou lista de histórico de versões */}
        </CardContent>
      </Card>
    </div>
  );
}

