
// src/app/new-control/page.tsx
"use client"; 

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Lightbulb, ArrowLeft } from "lucide-react";
import { suggestRelatedControls, type SuggestRelatedControlsInput, type SuggestRelatedControlsOutput } from '@/ai/flows/suggest-related-controls';
import { useToast } from "@/hooks/use-toast";
import { useUserProfile } from '@/contexts/user-profile-context';
import { mockChangeRequests } from '@/data/mock-data'; 
import type { ChangeRequest } from '@/types';
import Link from 'next/link';

const newControlSchema = z.object({
  proposedControlId: z.string().optional(), // ID do Controle Proposto (opcional)
  controlName: z.string().min(3, "Nome do controle é obrigatório."),
  justificativa: z.string().min(10, "Descrição/Justificativa é obrigatória."),
});

type NewControlFormValues = z.infer<typeof newControlSchema>;

export default function NewControlPage() {
  const { toast } = useToast();
  const { currentUser } = useUserProfile();
  const [descriptionForAI, setDescriptionForAI] = useState("");
  const [suggestedControls, setSuggestedControls] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [errorSuggestions, setErrorSuggestions] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<NewControlFormValues>({
    resolver: zodResolver(newControlSchema),
  });

  const handleSuggestControls = async () => {
    if (!descriptionForAI.trim()) {
      setErrorSuggestions("Por favor, insira uma descrição/justificativa para o controle primeiro.");
      return;
    }
    setIsLoadingSuggestions(true);
    setErrorSuggestions(null);
    setSuggestedControls([]);
    try {
      const input: SuggestRelatedControlsInput = { controlDescription: descriptionForAI };
      const result: SuggestRelatedControlsOutput = await suggestRelatedControls(input);
      setSuggestedControls(result.relatedControls);
    } catch (error) {
      console.error("Erro ao buscar sugestões:", error);
      setErrorSuggestions("Falha ao buscar sugestões. Por favor, tente novamente.");
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const onSubmit: SubmitHandler<NewControlFormValues> = async (data) => {
    const newRequestId = `cr-new-${Date.now()}`;
    const proposedId = data.proposedControlId || `TEMP-${Date.now()}`; // ID temporário se não for fornecido
    
    const newChangeRequest: ChangeRequest = {
      id: newRequestId,
      controlId: `NEW-CTRL-${proposedId.toUpperCase().replace(/\s+/g, '-')}`, 
      requestedBy: currentUser.name,
      requestDate: new Date().toISOString(),
      changes: { 
        controlId: data.proposedControlId, // O ID que o usuário sugeriu (pode ser undefined)
        controlName: data.controlName,
        description: data.justificativa, 
        justificativa: data.justificativa,
        // O Admin preencherá outros campos (owner, frequency, type, etc.) ao aprovar
        controlOwner: currentUser.name, // Sugere o solicitante como dono
        status: "Rascunho", 
      },
      status: "Pendente",
      comments: `Proposta de novo controle: ${data.controlName}. ID Sugerido: ${data.proposedControlId || 'N/A'}`,
    };

    mockChangeRequests.unshift(newChangeRequest); 

    toast({
      title: "Proposta Enviada!",
      description: `Sua proposta para o controle "${data.controlName}" foi enviada para aprovação.`,
      variant: "default",
    });
    reset(); 
    setDescriptionForAI("");
    setSuggestedControls([]);
  };

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
          <CardTitle>Solicitar Novo Controle</CardTitle>
          <CardDescription>
            Preencha os detalhes básicos para o novo controle. Sua proposta será enviada para análise do Administrador de Controles Internos.
            O Administrador completará os demais campos (como frequência, tipo, processo, etc.) durante a análise.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="proposedControlId">ID do Controle (Opcional - Sugestão)</Label>
              <Input id="proposedControlId" {...register("proposedControlId")} placeholder="Ex: FIN-010, IT-ABC (O Admin pode definir outro)" />
              {errors.proposedControlId && <p className="text-sm text-destructive mt-1">{errors.proposedControlId.message}</p>}
            </div>
            <div>
              <Label htmlFor="controlName">Nome do Controle</Label>
              <Input id="controlName" {...register("controlName")} placeholder="Nome conciso e claro para o controle" />
              {errors.controlName && <p className="text-sm text-destructive mt-1">{errors.controlName.message}</p>}
            </div>
            <div>
              <Label htmlFor="justificativa">Descrição / Justificativa do Controle</Label>
              <Textarea 
                id="justificativa" 
                {...register("justificativa")}
                placeholder="Descreva o objetivo do controle, como ele funciona e por que ele é necessário." 
                rows={5}
                onChange={(e) => setDescriptionForAI(e.target.value)} 
              />
              {errors.justificativa && <p className="text-sm text-destructive mt-1">{errors.justificativa.message}</p>}
            </div>

            <Card className="bg-accent/20 border-accent/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-accent-foreground" />
                  Sugestões de Controles Relacionados (IA)
                </CardTitle>
                <CardDescription>
                  Com base na descrição/justificativa, a IA pode sugerir controles existentes que podem ser semelhantes ou complementares.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button type="button" onClick={handleSuggestControls} disabled={isLoadingSuggestions || !descriptionForAI.trim()} className="mb-4">
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
                  <p className="text-sm text-muted-foreground">Insira uma descrição e clique em sugerir.</p>
                )}
              </CardContent>
            </Card>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar Proposta para Análise
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

