
// src/app/new-control/page.tsx
"use client"; 

import { useState } from 'react';
import { useForm, type SubmitHandler, Controller } from 'react-hook-form'; // Adicionado Controller
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Lightbulb, ArrowLeft } from "lucide-react";
import { suggestRelatedControls, type SuggestRelatedControlsInput, type SuggestRelatedControlsOutput } from '@/ai/flows/suggest-related-controls';
import { useToast } from "@/hooks/use-toast";
import { useUserProfile } from '@/contexts/user-profile-context';
import { mockChangeRequests, mockSoxControls, mockVersionHistory, mockProcessos, mockSubProcessos, mockDonos } from '@/data/mock-data'; 
import type { ChangeRequest, SoxControl, VersionHistoryEntry, ControlFrequency, ControlType, ControlModalidade } from '@/types';
import Link from 'next/link';

// Esquema para Dono do Controle (proposta básica)
const ownerNewControlSchema = z.object({
  proposedControlId: z.string().optional(),
  controlName: z.string().min(3, "Nome do controle é obrigatório (mínimo 3 caracteres)."),
  justificativa: z.string().min(10, "Descrição/Justificativa é obrigatória (mínimo 10 caracteres)."),
  // Campos adicionais que o Dono pode sugerir (opcionais para ele)
  controlOwner: z.string().optional(),
  controlFrequency: z.string().optional(), 
  controlType: z.string().optional(), 
  processo: z.string().optional(),
  subProcesso: z.string().optional(),
  modalidade: z.string().optional(), 
});

// Esquema para Administrador (criação direta)
const adminNewControlSchema = z.object({
  controlId: z.string().min(3, "ID do Controle é obrigatório."),
  controlName: z.string().min(3, "Nome do controle é obrigatório."),
  description: z.string().min(10, "Descrição é obrigatória."),
  controlOwner: z.string().min(1, "Dono do controle é obrigatório."),
  controlFrequency: z.enum(["Diário", "Semanal", "Mensal", "Trimestral", "Anual", "Ad-hoc"], {
    errorMap: () => ({ message: "Selecione uma frequência válida." }),
  }),
  controlType: z.enum(["Preventivo", "Detectivo", "Corretivo"], {
    errorMap: () => ({ message: "Selecione um tipo válido." }),
  }),
  processo: z.string().optional(),
  subProcesso: z.string().optional(),
  modalidade: z.enum(["Manual", "Automático", "Híbrido"], {
    errorMap: () => ({ message: "Selecione uma modalidade válida." }),
  }).optional(),
  relatedRisks: z.string().optional(), // Campo para string separada por vírgulas
  testProcedures: z.string().optional(),
  evidenceRequirements: z.string().optional(),
});

type OwnerFormValues = z.infer<typeof ownerNewControlSchema>;
type AdminFormValues = z.infer<typeof adminNewControlSchema>;
type FormValues = OwnerFormValues | AdminFormValues;


const controlFrequencies: ControlFrequency[] = ["Diário", "Semanal", "Mensal", "Trimestral", "Anual", "Ad-hoc"];
const controlTypes: ControlType[] = ["Preventivo", "Detectivo", "Corretivo"];
const controlModalidades: ControlModalidade[] = ["Manual", "Automático", "Híbrido"];
const filteredDonos = mockDonos.filter(dono => dono !== "Todos");


export default function NewControlPage() {
  const { toast } = useToast();
  const { currentUser, isUserAdmin } = useUserProfile();
  const [descriptionForAI, setDescriptionForAI] = useState("");
  const [suggestedControls, setSuggestedControls] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [errorSuggestions, setErrorSuggestions] = useState<string | null>(null);

  const currentSchema = isUserAdmin() ? adminNewControlSchema : ownerNewControlSchema;

  const { register, handleSubmit, control, formState: { errors, isSubmitting }, reset, setValue } = useForm<FormValues>({
    resolver: zodResolver(currentSchema),
    defaultValues: isUserAdmin() ? 
      { controlFrequency: undefined, controlType: undefined, modalidade: undefined, controlOwner: undefined, processo: undefined, subProcesso: undefined } : 
      { controlOwner: currentUser.name } // Dono sugere a si mesmo
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

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    if (isUserAdmin()) {
      const adminData = data as AdminFormValues;
      const newControlIdNumber = mockSoxControls.length + 1;
      const newSoxControl: SoxControl = {
        id: String(newControlIdNumber),
        controlId: adminData.controlId,
        controlName: adminData.controlName,
        description: adminData.description,
        controlOwner: adminData.controlOwner,
        controlFrequency: adminData.controlFrequency,
        controlType: adminData.controlType,
        status: "Ativo",
        lastUpdated: new Date().toISOString(),
        relatedRisks: adminData.relatedRisks ? adminData.relatedRisks.split(',').map(r => r.trim()) : [],
        testProcedures: adminData.testProcedures || "",
        evidenceRequirements: adminData.evidenceRequirements || "",
        processo: adminData.processo,
        subProcesso: adminData.subProcesso,
        modalidade: adminData.modalidade,
      };
      mockSoxControls.push(newSoxControl);
      mockVersionHistory.unshift({
        id: `vh-admin-new-${newSoxControl.id}-${Date.now()}`,
        controlId: newSoxControl.id,
        changeDate: new Date().toISOString(),
        changedBy: currentUser.name,
        summaryOfChanges: `Controle ${newSoxControl.controlId} criado diretamente pelo Administrador.`,
        newValues: { ...newSoxControl },
      });
      toast({
        title: "Controle Criado!",
        description: `O controle "${adminData.controlName}" foi criado com sucesso.`,
        variant: "default",
      });

    } else { // Dono do Controle submetendo proposta
      const ownerData = data as OwnerFormValues;
      const newRequestId = `cr-new-${Date.now()}`;
      const proposedId = ownerData.proposedControlId || `TEMP-${Date.now()}`; 
      
      const newChangeRequest: ChangeRequest = {
        id: newRequestId,
        controlId: `NEW-CTRL-${proposedId.toUpperCase().replace(/\s+/g, '-')}`, 
        requestedBy: currentUser.name,
        requestDate: new Date().toISOString(),
        changes: { 
          controlId: ownerData.proposedControlId,
          controlName: ownerData.controlName,
          description: ownerData.justificativa, 
          justificativa: ownerData.justificativa,
          // O Dono pode sugerir, Admin confirma/altera
          controlOwner: ownerData.controlOwner || currentUser.name, 
          controlFrequency: ownerData.controlFrequency as ControlFrequency,
          controlType: ownerData.controlType as ControlType,
          processo: ownerData.processo,
          subProcesso: ownerData.subProcesso,
          modalidade: ownerData.modalidade as ControlModalidade,
          status: "Rascunho", 
        },
        status: "Pendente",
        comments: `Proposta de novo controle: ${ownerData.controlName}. ID Sugerido: ${ownerData.proposedControlId || 'N/A'}`,
      };
      mockChangeRequests.unshift(newChangeRequest); 
      toast({
        title: "Proposta Enviada!",
        description: `Sua proposta para o controle "${ownerData.controlName}" foi enviada para aprovação.`,
        variant: "default",
      });
      setDescriptionForAI(""); // Limpa campo de descrição para IA
      setSuggestedControls([]); // Limpa sugestões
    }
    reset(); 
  };

  const pageTitle = isUserAdmin() ? "Criar Novo Controle" : "Solicitar Novo Controle";
  const pageDescription = isUserAdmin() 
    ? "Preencha todos os detalhes para criar um novo controle diretamente na matriz."
    : "Preencha os detalhes básicos para o novo controle. Sua proposta será enviada para análise do Administrador.";

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
          <CardTitle>{pageTitle}</CardTitle>
          <CardDescription>{pageDescription}</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {isUserAdmin() ? (
              <> {/* Campos para Administrador */}
                <div>
                  <Label htmlFor="controlId">ID do Controle</Label>
                  <Input id="controlId" {...register("controlId")} placeholder="Ex: FIN-010, IT-ABC" />
                  {errors.controlId && <p className="text-sm text-destructive mt-1">{(errors.controlId as any).message}</p>}
                </div>
                <div>
                  <Label htmlFor="controlName">Nome do Controle</Label>
                  <Input id="controlName" {...register("controlName")} placeholder="Nome conciso e claro" />
                  {errors.controlName && <p className="text-sm text-destructive mt-1">{(errors.controlName as any).message}</p>}
                </div>
                <div>
                  <Label htmlFor="description">Descrição Completa do Controle</Label>
                  <Textarea id="description" {...register("description")} placeholder="Descreva detalhadamente o controle." rows={5} />
                  {errors.description && <p className="text-sm text-destructive mt-1">{(errors.description as any).message}</p>}
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="controlOwner">Dono do Controle</Label>
                        <Controller
                            name="controlOwner"
                            control={control}
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger><SelectValue placeholder="Selecione o dono" /></SelectTrigger>
                                    <SelectContent>
                                        {filteredDonos.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                        {errors.controlOwner && <p className="text-sm text-destructive mt-1">{(errors.controlOwner as any).message}</p>}
                    </div>
                    <div>
                        <Label htmlFor="controlFrequency">Frequência</Label>
                         <Controller
                            name="controlFrequency"
                            control={control}
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value as string | undefined}>
                                    <SelectTrigger><SelectValue placeholder="Selecione a frequência" /></SelectTrigger>
                                    <SelectContent>
                                        {controlFrequencies.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                        {errors.controlFrequency && <p className="text-sm text-destructive mt-1">{(errors.controlFrequency as any).message}</p>}
                    </div>
                </div>
                 <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="controlType">Tipo (P/D)</Label>
                        <Controller
                            name="controlType"
                            control={control}
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value as string | undefined}>
                                    <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                                    <SelectContent>
                                        {controlTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                        {errors.controlType && <p className="text-sm text-destructive mt-1">{(errors.controlType as any).message}</p>}
                    </div>
                    <div>
                        <Label htmlFor="modalidade">Modalidade</Label>
                        <Controller
                            name="modalidade"
                            control={control}
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value as string | undefined}>
                                    <SelectTrigger><SelectValue placeholder="Selecione a modalidade" /></SelectTrigger>
                                    <SelectContent>
                                        {controlModalidades.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                        {errors.modalidade && <p className="text-sm text-destructive mt-1">{(errors.modalidade as any).message}</p>}
                    </div>
                 </div>
                 <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="processo">Processo</Label>
                         <Controller
                            name="processo"
                            control={control}
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger><SelectValue placeholder="Selecione o processo" /></SelectTrigger>
                                    <SelectContent>
                                        {mockProcessos.filter(p => p !== "Todos").map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                        {errors.processo && <p className="text-sm text-destructive mt-1">{(errors.processo as any).message}</p>}
                    </div>
                    <div>
                        <Label htmlFor="subProcesso">Subprocesso</Label>
                        <Controller
                            name="subProcesso"
                            control={control}
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger><SelectValue placeholder="Selecione o subprocesso" /></SelectTrigger>
                                    <SelectContent>
                                        {mockSubProcessos.filter(s => s !== "Todos").map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                        {errors.subProcesso && <p className="text-sm text-destructive mt-1">{(errors.subProcesso as any).message}</p>}
                    </div>
                </div>
                <div>
                  <Label htmlFor="relatedRisks">Riscos Relacionados (separados por vírgula)</Label>
                  <Input id="relatedRisks" {...register("relatedRisks")} placeholder="Risco A, Risco B" />
                </div>
                <div>
                  <Label htmlFor="testProcedures">Procedimentos de Teste</Label>
                  <Textarea id="testProcedures" {...register("testProcedures")} placeholder="Descreva os procedimentos de teste." rows={3} />
                </div>
                <div>
                  <Label htmlFor="evidenceRequirements">Requisitos de Evidência</Label>
                  <Textarea id="evidenceRequirements" {...register("evidenceRequirements")} placeholder="Descreva os requisitos de evidência." rows={3} />
                </div>
              </>
            ) : (
              <> {/* Campos para Dono do Controle */}
                <div>
                  <Label htmlFor="proposedControlId">ID do Controle (Opcional - Sugestão)</Label>
                  <Input id="proposedControlId" {...register("proposedControlId")} placeholder="Ex: FIN-010 (Admin pode definir outro)" />
                  {errors.proposedControlId && <p className="text-sm text-destructive mt-1">{(errors.proposedControlId as any).message}</p>}
                </div>
                <div>
                  <Label htmlFor="controlName">Nome do Controle</Label>
                  <Input id="controlName" {...register("controlName")} placeholder="Nome conciso e claro para o controle" />
                  {errors.controlName && <p className="text-sm text-destructive mt-1">{(errors.controlName as any).message}</p>}
                </div>
                <div>
                  <Label htmlFor="justificativa">Descrição / Justificativa do Controle</Label>
                  <Textarea 
                    id="justificativa" 
                    {...register("justificativa")}
                    placeholder="Descreva o objetivo do controle, como ele funciona e por que ele é necessário." 
                    rows={5}
                    onChange={(e) => {
                        setValue("justificativa", e.target.value); // Atualiza o campo do formulário
                        setDescriptionForAI(e.target.value);      // Atualiza estado para IA
                    }}
                  />
                  {errors.justificativa && <p className="text-sm text-destructive mt-1">{(errors.justificativa as any).message}</p>}
                </div>
                 <p className="text-sm text-muted-foreground mt-4">Campos adicionais (opcional - serão definidos pelo Administrador na aprovação):</p>
                 <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="ownerControlOwner">Dono do Controle (Sugestão)</Label>
                         <Controller
                            name="controlOwner"
                            control={control}
                            defaultValue={currentUser.name} // Sugere o usuário atual
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger><SelectValue placeholder="Sugira o dono" /></SelectTrigger>
                                    <SelectContent>
                                        {filteredDonos.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </div>
                    <div>
                        <Label htmlFor="ownerControlFrequency">Frequência (Sugestão)</Label>
                        <Controller
                            name="controlFrequency"
                            control={control}
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value as string | undefined}>
                                    <SelectTrigger><SelectValue placeholder="Sugira a frequência" /></SelectTrigger>
                                    <SelectContent>
                                        {controlFrequencies.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </div>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                     <div>
                        <Label htmlFor="ownerControlType">Tipo (P/D) (Sugestão)</Label>
                         <Controller
                            name="controlType"
                            control={control}
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value as string | undefined}>
                                    <SelectTrigger><SelectValue placeholder="Sugira o tipo" /></SelectTrigger>
                                    <SelectContent>
                                        {controlTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </div>
                    <div>
                        <Label htmlFor="ownerProcesso">Processo (Sugestão)</Label>
                        <Controller
                            name="processo"
                            control={control}
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger><SelectValue placeholder="Sugira o processo" /></SelectTrigger>
                                    <SelectContent>
                                        {mockProcessos.filter(p => p !== "Todos").map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </div>
                     <div>
                        <Label htmlFor="ownerModalidade">Modalidade (Sugestão)</Label>
                         <Controller
                            name="modalidade"
                            control={control}
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value as string | undefined}>
                                    <SelectTrigger><SelectValue placeholder="Sugira a modalidade" /></SelectTrigger>
                                    <SelectContent>
                                        {controlModalidades.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </div>
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
              </>
            )}
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isUserAdmin() ? "Criar Controle" : "Enviar Proposta para Análise"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

    