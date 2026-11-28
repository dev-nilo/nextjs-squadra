import type React from "react";
import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "sonner";
import "./globals.css";
import { RegistrarServiceWorker } from "@/components/pwa/registrar-sw";
import { Providers } from "./providers";

// Variable axes: wdth (75–100) for the condensed printed numerals, opsz for display sizes.
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  axes: ["wdth", "opsz"],
});

export const metadata: Metadata = {
  title: "Squadra",
  applicationName: "Squadra",
  // Added to the iPhone home screen it opens full screen, like the installed app on Android.
  appleWebApp: { capable: true, title: "Squadra", statusBarStyle: "default" },
  // Also the preview under a Squadra link pasted in WhatsApp, which reads og:description.
  description: "A lista do fut: quem vai, a lista de espera e os times sorteados.",
  openGraph: {
    siteName: "Squadra",
    description: "A lista do fut: quem vai, a lista de espera e os times sorteados.",
  },
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F2F4F7" },
    { media: "(prefers-color-scheme: dark)", color: "#14213D" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  // Draw under the iPhone's notch and home indicator; the fut's header and tab bar pad by the safe area.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${bricolage.variable} font-sans antialiased bg-background text-foreground`}>
        <Providers>
          {children}
          <Toaster position="top-center" richColors theme="system" />
          <Analytics />
          <RegistrarServiceWorker />
        </Providers>
      </body>
    </html>
  );
}
