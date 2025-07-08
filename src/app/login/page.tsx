
"use client";

import { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/contexts/user-profile-context';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, LogIn } from 'lucide-react';
import { Icons } from '@/components/icons';

const loginSchema = z.object({
  email: z.string().email({ message: "Por favor, insira um e-mail válido." }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { loginWithEmail, isAuthenticated } = useUserProfile();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/sox-matrix');
    }
  }, [isAuthenticated, router]);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit: SubmitHandler<LoginFormValues> = (data) => {
    setIsLoading(true);
    // The login function now returns a boolean for success/failure
    const success = loginWithEmail(data.email);

    if (success) {
      toast({
        title: 'Login bem-sucedido!',
        description: 'Redirecionando para o painel...',
      });
      // The redirect will happen automatically via the AppLayout's effect
      // But we can push it here for a faster user experience.
      router.replace('/sox-matrix');
    } else {
      toast({
        title: 'Erro de Login',
        description: 'E-mail não encontrado ou sem permissão de acesso. Verifique o e-mail e tente novamente.',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/30">
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader className="text-center">
            <div className="mx-auto h-12 w-auto flex justify-center text-primary">
                <Icons.AppLogo />
            </div>
            <CardTitle className="mt-4">Portal de Controles Internos</CardTitle>
            <CardDescription>Insira seu e-mail para acessar o sistema</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu.nome@rumolog.com"
                {...register("email")}
                disabled={isLoading}
              />
              {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="mr-2 h-4 w-4" />
              )}
              Entrar
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
