
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUserProfile } from "@/contexts/user-profile-context";
import Icons from "@/components/icons";
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { login, currentUser, loading } = useUserProfile();

  useEffect(() => {
    // If auth check is done and user is logged in, redirect to home.
    if (!loading && currentUser) {
      router.push('/');
    }
  }, [currentUser, loading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const user = login(email, password);

    if (user) {
      // The useEffect hook will handle the redirection once currentUser is updated.
      // No need to redirect here to avoid race conditions.
    } else {
      setError('Credenciais inválidas. Tente novamente.');
      setIsSubmitting(false);
    }
  };

  // While checking auth state or if user is logged in (and waiting for redirect), show a loader.
  if (loading || currentUser) {
    return (
        <div className="flex items-center justify-center h-screen bg-background">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  // Only show the login form if auth is checked and there's no user.
  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="flex flex-col items-center p-4 sm:p-6">
        <div className="mb-8 text-center">
          <Icons.AppLogo className="w-16 h-16 mx-auto text-primary mb-4" />
          <h1 className="text-3xl font-bold text-foreground">Hub de Controles Internos</h1>
        </div>
        <Card className="w-full max-w-sm shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Login</CardTitle>
            <CardDescription className="text-center">Digite seu email e senha para acessar.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 text-base"
                />
              </div>
              {error && <p className="text-destructive text-sm text-center">{error}</p>}
              <Button type="submit" className="w-full h-11 text-base" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Entrando...' : 'Login'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
