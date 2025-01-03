
import Header from '@/components/layout/Header';
import { GeocodeProvider } from '@/components/search/GeocodeContext';
import { BoundsProvider } from '@/components/search/boundscontext';
import { MantineProvider, createTheme } from '@mantine/core';
import '@mantine/core/styles.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';


const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'NewCasa',
  description: 'NewCasa MVP',
};

const mantineTheme = createTheme({
  primaryColor: 'blue',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <MantineProvider theme={mantineTheme} forceColorScheme="light">
          <GeocodeProvider>
            <BoundsProvider>
              <Header />
              {children}
            </BoundsProvider>
          </GeocodeProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
