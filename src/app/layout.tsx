
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppLayout } from '@/components/layout/app-layout';
import { Toaster } from "@/components/ui/toaster";
import { UserProfileProvider } from '@/contexts/user-profile-context';
import { NotificationProvider } from '@/contexts/notification-context';

const fontSans = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Portal de Controles Internos',
  description: 'Portal de Controles Internos.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${fontSans.variable} antialiased`}>
        <UserProfileProvider>
          <NotificationProvider>
            <AppLayout>{children}</AppLayout>
            <Toaster />
          </NotificationProvider>
        </UserProfileProvider>
      </body>
    </html>
  );
}
