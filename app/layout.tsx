import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { LanguageProvider } from './components/LanguageProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'TO-DO-LIST',
  description: 'A clean modern todo app',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="zh-CN">
        <body>
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
