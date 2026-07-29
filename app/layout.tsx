import type { Metadata } from "next";
import { Press_Start_2P, JetBrains_Mono, Courier_Prime } from "next/font/google";
import Footer from "@/components/footer";
import Nav from "@/components/nav";
import { SessionProvider } from "@/lib/session";
import "./globals.css";

const pressStart = Press_Start_2P({
  variable: "--font-press-start",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  fallback: ["system-ui", "monospace"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  fallback: ["Courier New", "monospace"],
});

const courierPrime = Courier_Prime({
  variable: "--font-courier-prime",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  fallback: ["Courier New", "monospace"],
});

export const metadata: Metadata = {
  title: "Arcade Vault · Portal Retro",
  description:
    "Juega clásicos arcade online y compite por el mejor puntaje en el salón de la fama.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${pressStart.variable} ${jetbrainsMono.variable} ${courierPrime.variable}`}
    >
      <body>
        <div className="av-bg" aria-hidden="true" />
        <div className="av-noise" aria-hidden="true" />
        <SessionProvider>
          <div className="av-root">
            <Nav />
            {children}
            <Footer />
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}
