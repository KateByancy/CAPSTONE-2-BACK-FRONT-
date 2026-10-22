import type { Metadata } from "next";
import { Numans, Poller_One } from "next/font/google";
import "./globals.css";

const numans = Numans({
  variable: "--font-numans",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const pollerOne = Poller_One({
  variable: "--font-poller-one",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.marcinteriordesign.site"),
  title: "MARC Custom Designs | Interior Design & Construction",
  description:
    "Explore MARC Custom Designs' interior projects and book design and construction services through the client workspace.",
  applicationName: "MARC Custom Designs",
  openGraph: {
    url: "https://www.marcinteriordesign.site/",
    siteName: "MARC Interior Design",
    title: "MARC Custom Designs | Interior Design & Construction",
    description:
      "Explore MARC Custom Designs' interior projects and book design and construction services through the client workspace.",
    type: "website",
    images: [
      {
        url: "marc-interior-design.png",
        secureUrl: "https://www.marcinteriordesign.site/marc-share-preview.jpg",
        type: "image/jpeg",
        width: 1290,
        height: 832,
        alt: "Marc Interior Design — Inspired Living. Timeless Design.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["https://www.marcinteriordesign.site/marc-share-preview.jpg"],
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
      <body className={`${numans.variable} ${pollerOne.variable} font-sans h-full m-0 p-0 bg-stone-100 text-stone-800 antialiased`}>
        {children}
      </body>
    </html>
  );
}
