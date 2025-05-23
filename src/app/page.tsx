"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/sox-matrix');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Redirecionando...</p>
    </div>
  );
}
