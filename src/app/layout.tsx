// File: app/layout.tsx

import Header from "@/components/layout/Header";
import SiteFooter from "@/components/layout/SiteFooter";
import { GeocodeProvider } from "@/components/search/GeocodeContext";
import { BoundsProvider } from "@/components/search/boundscontext";
import { FilterProvider } from "@/components/search/FilterContext";
import { MantineProvider, createTheme } from "@mantine/core";
import "@mantine/core/styles.css";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientLoadScript from "../lib/utils/ClientLoadScript";
import InstallPWA from "../components/InstallPWA";

const inter = Inter({ subsets: ["latin"] });

// Separate viewport configuration
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#ffffff"
};

export const metadata: Metadata = {
  title: "NewCasa",
  description: "NewCasa MVP",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'NewCasa',
  },
  formatDetection: {
    telephone: false,
  },
  // No longer including viewport and themeColor here
};

const mantineTheme = createTheme({
  primaryColor: "blue",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        
        {/* iOS splash screens - include these if you created splash images */}
        <link rel="apple-touch-startup-image" href="/splash/apple-splash-2048-2732.png" media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/splash/apple-splash-1668-2388.png" media="(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/splash/apple-splash-1536-2048.png" media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/splash/apple-splash-1125-2436.png" media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/splash/apple-splash-1242-2688.png" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/splash/apple-splash-828-1792.png" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/splash/apple-splash-1242-2208.png" media="(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/splash/apple-splash-750-1334.png" media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/splash/apple-splash-640-1136.png" media="(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
      </head>
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
                <InstallPWA />
              </FilterProvider>
            </BoundsProvider>
          </GeocodeProvider>
        </MantineProvider>
      </body>
    </html>
  );
}