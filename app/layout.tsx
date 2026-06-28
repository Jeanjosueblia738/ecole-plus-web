import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ECOLE+ | Plateforme de gestion scolaire',
  description: "La plateforme éducative intelligente pour la Côte d'Ivoire",
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon.png' },
    ],
    apple: '/favicon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={inter.className}>{children}</body>
    </html>
  );
}