import type { Metadata, Viewport } from "next";
import "../src/styles.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reboot Performance",
  description: "Application premium de coaching sportif, nutritionnel et performance.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Reboot Performance",
    statusBarStyle: "black-translucent"
  },
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/icon.svg"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f0d0a"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" data-theme="dark" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
