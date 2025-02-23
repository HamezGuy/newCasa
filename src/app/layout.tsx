// File: app/layout.tsx

import Header from "@/components/layout/Header";
import SiteFooter from "@/components/layout/SiteFooter"; // CHANGED: new import for the footer
import { GeocodeProvider } from "@/components/search/GeocodeContext";
import { BoundsProvider } from "@/components/search/boundscontext";
import { FilterProvider } from "@/components/search/FilterContext";
import { MantineProvider, createTheme } from "@mantine/core";
import "@mantine/core/styles.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientLoadScript from "../lib/utils/ClientLoadScript";

// CHANGED: We’ll reference your newcasalogo.jpeg for the site icon
// Make sure you placed newcasalogo.jpeg in the `public/` folder.

const inter = Inter({ subsets: ["latin"] });

// Updated viewport to lock scale, preventing mobile zoom
export const metadata: Metadata = {
  title: "NewCasa",
  description: "NewCasa MVP",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",

  // CHANGED: Use your custom logo as favicon/shortcut icon
  icons: {
    icon: "/newcasalogo.jpeg",        // main favicon
    shortcut: "/newcasalogo.jpeg",    // optional “shortcut icon”
    apple: "/newcasalogo.jpeg",       // optional Apple touch icon
  },
};

const mantineTheme = createTheme({
  primaryColor: "blue",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <MantineProvider theme={mantineTheme} forceColorScheme="light">
          <GeocodeProvider>
            <BoundsProvider>
              <FilterProvider>
                <Header />
                <ClientLoadScript>
                  {children}
                </ClientLoadScript>

                <SiteFooter />
              </FilterProvider>
            </BoundsProvider>
          </GeocodeProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
