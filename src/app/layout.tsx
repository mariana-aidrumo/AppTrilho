
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AppLayout } from '@/components/layout/app-layout';
import { Toaster } from "@/components/ui/toaster";
import { UserProfileProvider } from '@/contexts/user-profile-context';
import { NotificationProvider } from '@/contexts/notification-context'; // Correct import

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'SOX Hub',
  description: 'Hub de Controles SOX.',
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
          <NotificationProvider> {/* NotificationProvider wraps AppLayout */}
            <AppLayout>{children}</AppLayout>
            <Toaster />
          </NotificationProvider>
        </UserProfileProvider>
      </body>
    </html>
  );
}
