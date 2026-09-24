import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MARC Custom Designs | Interior Design & Construction",
  description:
    "Explore MARC Custom Designs' interior projects and book design and construction services through the client workspace.",
  applicationName: "MARC Custom Designs",
  openGraph: {
    title: "MARC Custom Designs | Interior Design & Construction",
    description:
      "Explore MARC Custom Designs' interior projects and book design and construction services through the client workspace.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "MARC Custom Designs | Interior Design & Construction",
    description:
      "Explore MARC Custom Designs' interior projects and book design and construction services through the client workspace.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans h-full m-0 p-0 bg-slate-100 text-slate-800 antialiased`}>
        {children}
      </body>
    </html>
  );
}
