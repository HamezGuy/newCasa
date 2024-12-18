import Header from "@/components/layout/Header";
import { MantineProvider, createTheme } from "@mantine/core";
import "@mantine/core/styles.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NewCasa",
  description: "NewCasa MVP",
};

const mantineTheme = createTheme({
  primaryColor: "blue",
});
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <MantineProvider theme={mantineTheme} forceColorScheme="light">
          <Header />
          {children}
        </MantineProvider>
      </body>
    </html>
  );
}

