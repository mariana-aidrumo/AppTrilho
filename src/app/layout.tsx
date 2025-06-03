
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AppLayout } from '@/components/layout/app-layout';
import { Toaster } from "@/components/ui/toaster";
import { UserProfileProvider } from '@/contexts/user-profile-context';
import { NotificationProvider } from '@/contexts/notification-context';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Hub de Controles Internos',
  description: 'Hub de Controles Internos.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
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
