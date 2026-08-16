import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const SITE_URL = "https://www.repwisely.com";

const DESCRIPTION =
  "Personalised training and nutrition plans that adapt to your body, your goals and where you train.";

export const metadata: Metadata = {
  /* Resolves the relative URLs Next.js emits for Open Graph and Twitter cards.
     Without it those tags fall back to localhost in dev and to the Vercel
     preview host in production, so shared links preview the wrong origin. */
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Repwisely — Train smarter, every rep",
    template: "%s · Repwisely",
  },
  description: DESCRIPTION,
  applicationName: "Repwisely",
  openGraph: {
    type: "website",
    siteName: "Repwisely",
    url: SITE_URL,
    title: "Repwisely — Train smarter, every rep",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Repwisely — Train smarter, every rep",
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#080c0a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${jakarta.variable}`}>
      <body>{children}</body>
    </html>
  );
}
