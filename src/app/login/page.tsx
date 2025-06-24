"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// Esta página não é mais usada para login, mas serve como um
// ponto de entrada que redireciona para a página principal.
export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Redireciona imediatamente para a raiz, que por sua vez
    // redirecionará para a página principal da matriz.
    router.replace('/');
  }, [router]);

  // Exibe um loader enquanto o redirecionamento acontece.
  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  );
}

    