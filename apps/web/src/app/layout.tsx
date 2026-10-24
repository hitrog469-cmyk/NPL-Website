import type { Metadata, Viewport } from "next";
import { Anek_Devanagari, Big_Shoulders, Inter_Tight } from "next/font/google";
import { Masthead } from "@/components/Masthead";
import { Footer } from "@/components/Footer";
import { SITE } from "@/lib/site";
import "./globals.css";
import "./live.css";

// All three families are SIL Open Font License; next/font self-hosts them at build.
const display = Big_Shoulders({ subsets: ["latin"], weight: ["700", "800"], variable: "--f-display", display: "swap" });
const body = Inter_Tight({ subsets: ["latin"], weight: ["400", "600", "700", "800"], variable: "--f-body", display: "swap" });
const deva = Anek_Devanagari({ subsets: ["devanagari", "latin"], weight: ["500", "700"], variable: "--f-deva", display: "swap", preload: false });

export const metadata: Metadata = {
  title: { default: `${SITE.name} — ${SITE.tagline}`, template: `%s · ${SITE.name}` },
  description: `${SITE.tagline}. Ball-by-ball records, results and points table. ${SITE.independence}`,
};

// Date strip and countdown are Kathmandu-date dependent; refresh hourly.
export const revalidate = 3600;

export const viewport: Viewport = { themeColor: "#0b0b0c" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${deva.variable}`}>
      <body>
        <a href="#main" className="sr-only">Skip to content</a>
        <Masthead />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
