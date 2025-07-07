
"use client";

import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useUserProfile } from "@/contexts/user-profile-context";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import Link from "next/link";
import { addChangeRequest } from "@/services/sox-service";
import { useRouter } from 'next/navigation';

const newControlSchema = z.object({
  controlName: z.string().min(10, { message: "O nome do controle deve ter pelo menos 10 caracteres." }),
  reason: z.string().min(20, { message: "O motivo deve ter pelo menos 20 caracteres." }),
});

type NewControlFormValues = z.infer<typeof newControlSchema>;

export default function RequestNewControlPage() {
  const { currentUser, isUserControlOwner } = useUserProfile();
  const { toast } = useToast();
  const router = useRouter();
  
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<NewControlFormValues>({
    resolver: zodResolver(newControlSchema),
  });

  if (!isUserControlOwner()) {
    return (
      <div className="space-y-6 w-full max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Esta página é destinada apenas para Donos de Controle.</p>
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

  const onSubmit: SubmitHandler<NewControlFormValues> = async (data) => {
    try {
        const tempControlId = `NEW-CTRL-${Date.now()}`;
        
        await addChangeRequest({
            requestType: "Criação",
            controlId: tempControlId,
            controlName: data.controlName,
            requestedBy: currentUser.name,
            comments: `Nome proposto: ${data.controlName}. Motivo: ${data.reason}`, // This is the human-readable summary
            fieldName: 'controlName', // The technical field being proposed
            newValue: data.controlName, // The technical value for the field
        });

        toast({
            title: "Solicitação Enviada",
            description: "Sua proposta de novo controle foi enviada para aprovação.",
        });
        
        reset();
        router.push('/pending-approvals'); // Redirect user to see their new request

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Não foi possível enviar a solicitação.";
        toast({
            title: "Erro ao Enviar Solicitação",
            description: errorMessage,
            variant: "destructive",
        });
    }
  };

  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto">
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
            Preencha os detalhes abaixo para propor a criação de um novo controle. A solicitação será revisada pela equipe de Controles Internos.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="controlName">Nome do Controle</Label>
              <Input
                id="controlName"
                placeholder="Ex: Revisão de acessos críticos ao sistema SAP"
                {...register("controlName")}
              />
              {errors.controlName && <p className="text-sm text-destructive mt-1">{errors.controlName.message}</p>}
            </div>
            <div>
              <Label htmlFor="reason">Motivo / Justificativa</Label>
              <Textarea
                id="reason"
                placeholder="Descreva por que este controle é necessário, qual risco ele mitiga e como ele funciona."
                className="min-h-[120px]"
                {...register("reason")}
              />
              {errors.reason && <p className="text-sm text-destructive mt-1">{errors.reason.message}</p>}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Enviar Solicitação
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
