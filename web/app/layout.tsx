import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import { AuthProvider } from "@/lib/auth/auth-context";
import { AnalyticsProvider } from "@/components/analytics-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ragaflow.io"),
  title: {
    default: "Ragaflow",
    template: "%s | Ragaflow",
  },
  description: "Indian classical ragas for focus, sleep, and meditation",
  openGraph: {
    title: "Ragaflow",
    description: "Indian classical ragas for focus, sleep, and meditation",
    siteName: "Ragaflow",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ragaflow",
    description: "Indian classical ragas for focus, sleep, and meditation",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfairDisplay.variable} antialiased`}
      >
        <AuthProvider>
          <AnalyticsProvider>
            <div className="app-frame">{children}</div>
          </AnalyticsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
