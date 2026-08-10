import type { Metadata } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";
import SiteChrome from "@/components/SiteChrome";
import { LazyAiPanel } from "@/components/LazyChrome";
import Splash from "@/components/Splash";
import DiagramZoom from "@/components/DiagramZoom";
import OfflineReady from "@/components/OfflineReady";

// Archivo carries a width axis, which is how the Eurostile Bold Extended feel
// of the reference is reached without licensing it.
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://csuisse90.github.io"),
  title: {
    default: "IB CS HL",
    template: "%s — IB CS HL",
  },
  description:
    "IB Computer Science HL Theme A, first assessment 2027: computer fundamentals (A1) and networks (A2), including an interactive logic gate simulator you can slow right down to watch signals propagate.",
  openGraph: {
    title: "IB CS HL",
    description:
      "Full written course for IB Computer Science HL Theme A, with an interactive logic gate simulator.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${archivo.variable} ${mono.variable}`}>
      <body>
        <Splash />
        <SiteChrome>{children}</SiteChrome>
        <LazyAiPanel />
        <DiagramZoom />
        <OfflineReady />
      </body>
    </html>
  );
}
