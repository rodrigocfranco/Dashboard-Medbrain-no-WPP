import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/layout/sidebar';
import { PeriodProvider } from '@/contexts/period-context';
import { Suspense } from 'react';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Medbrain Analytics Dashboard',
  description: 'Dashboard analítico do Medbrain',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} bg-gray-50 antialiased`}>
        <Suspense>
          <PeriodProvider>
            <Sidebar />
            <main className="lg:ml-56 min-h-screen">{children}</main>
          </PeriodProvider>
        </Suspense>
      </body>
    </html>
  );
}
