// TODO: Este componente será um client component para manipulação de formulário e interação com IA
"use client"; 

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Lightbulb } from "lucide-react";
import { suggestRelatedControls, type SuggestRelatedControlsInput, type SuggestRelatedControlsOutput } from '@/ai/flows/suggest-related-controls'; // AI Flow

export default function NewControlPage() {
  const [controlDescription, setControlDescription] = useState("");
  const [suggestedControls, setSuggestedControls] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [errorSuggestions, setErrorSuggestions] = useState<string | null>(null);

  const handleSuggestControls = async () => {
    if (!controlDescription.trim()) {
      setErrorSuggestions("Por favor, insira uma descrição para o controle primeiro.");
      return;
    }
    setIsLoadingSuggestions(true);
    setErrorSuggestions(null);
    setSuggestedControls([]);
    try {
      const input: SuggestRelatedControlsInput = { controlDescription };
      const result: SuggestRelatedControlsOutput = await suggestRelatedControls(input);
      setSuggestedControls(result.relatedControls);
    } catch (error) {
      console.error("Erro ao buscar sugestões:", error);
      setErrorSuggestions("Falha ao buscar sugestões. Por favor, tente novamente.");
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // TODO: Implementar lógica de submissão do formulário
    // Isso envolveria criar uma nova ChangeRequest com status "Pendente" para um novo controle.
    console.log("Formulário enviado com os dados:", new FormData(event.currentTarget));
    // Mostrar notificação de toast em caso de sucesso/falha
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Propor Novo Controle</CardTitle>
          <CardDescription>
            Preencha os detalhes para o novo controle. Todos os novos controles estão sujeitos à aprovação.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="controlId">ID do Controle</Label>
                <Input id="controlId" name="controlId" placeholder="Ex: FIN-00X, IT-00Y" required />
              </div>
              <div>
                <Label htmlFor="controlName">Nome do Controle</Label>
                <Input id="controlName" name="controlName" placeholder="Nome do controle" required />
              </div>
            </div>
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea 
                id="description" 
                name="description"
                placeholder="Descrição detalhada do objetivo e atividades do controle." 
                value={controlDescription}
                onChange={(e) => setControlDescription(e.target.value)}
                required 
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="controlOwner">Dono do Controle</Label>
                <Input id="controlOwner" name="controlOwner" placeholder="Nome ou departamento" required />
              </div>
              <div>
                <Label htmlFor="controlFrequency">Frequência do Controle</Label>
                <Select name="controlFrequency" required>
                  <SelectTrigger id="controlFrequency">
                    <SelectValue placeholder="Selecione a frequência" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Diário">Diário</SelectItem>
                    <SelectItem value="Semanal">Semanal</SelectItem>
                    <SelectItem value="Mensal">Mensal</SelectItem>
                    <SelectItem value="Trimestral">Trimestral</SelectItem>
                    <SelectItem value="Anual">Anual</SelectItem>
                    <SelectItem value="Ad-hoc">Ad-hoc</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="controlType">Tipo de Controle</Label>
                 <Select name="controlType" required>
                  <SelectTrigger id="controlType">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Preventivo">Preventivo</SelectItem>
                    <SelectItem value="Detectivo">Detectivo</SelectItem>
                    <SelectItem value="Corretivo">Corretivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="processo">Processo</Label>
                    <Input id="processo" name="processo" placeholder="Ex: Relatórios Financeiros" />
                </div>
                <div>
                    <Label htmlFor="subProcesso">Subprocesso</Label>
                    <Input id="subProcesso" name="subProcesso" placeholder="Ex: Fechamento Mensal" />
                </div>
            </div>
             <div>
                <Label htmlFor="modalidade">Modalidade do Controle</Label>
                <Select name="modalidade">
                  <SelectTrigger id="modalidade">
                    <SelectValue placeholder="Selecione a modalidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Manual">Manual</SelectItem>
                    <SelectItem value="Automático">Automático</SelectItem>
                    <SelectItem value="Híbrido">Híbrido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            <div>
                <Label htmlFor="relatedRisks">Riscos Relacionados (separados por vírgula)</Label>
                <Input id="relatedRisks" name="relatedRisks" placeholder="Ex: Demonstração Financeira Incorreta, Acesso Não Autorizado" />
            </div>
            <div>
                <Label htmlFor="testProcedures">Procedimentos de Teste</Label>
                <Textarea id="testProcedures" name="testProcedures" placeholder="Descreva como este controle é testado." />
            </div>
            <div>
                <Label htmlFor="evidenceRequirements">Requisitos de Evidência</Label>
                <Textarea id="evidenceRequirements" name="evidenceRequirements" placeholder="Qual evidência é necessária para provar a operação do controle?" />
            </div>

            {/* Seção de Sugestão de Controles por IA */}
            <Card className="bg-accent/20 border-accent/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-accent-foreground" />
                  Controles Relacionados Sugeridos por IA
                </CardTitle>
                <CardDescription>
                  Com base na descrição do controle, aqui estão alguns controles potencialmente relacionados.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button type="button" onClick={handleSuggestControls} disabled={isLoadingSuggestions || !controlDescription.trim()} className="mb-4">
                  {isLoadingSuggestions && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sugerir Controles Relacionados
                </Button>
                {errorSuggestions && <p className="text-sm text-destructive">{errorSuggestions}</p>}
                {suggestedControls.length > 0 && (
                  <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                    {suggestedControls.map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                )}
                {suggestedControls.length === 0 && !isLoadingSuggestions && !errorSuggestions && (
                  <p className="text-sm text-muted-foreground">Insira uma descrição e clique em sugerir para ver controles relacionados.</p>
                )}
              </CardContent>
            </Card>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button type="submit">Enviar para Aprovação</Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
