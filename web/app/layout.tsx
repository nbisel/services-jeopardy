import type { Metadata, Viewport } from "next";
import { Anton } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";

const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
});

export const metadata: Metadata = {
  title: "Services Jeopardy",
  description: "Daily calendar Jeopardy score tracker",
};

export const viewport: Viewport = {
  themeColor: "#0a0e2f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full antialiased ${anton.variable}`}>
      <body className="min-h-full">
        <Nav />
        <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6">{children}</main>
      </body>
    </html>
  );
}
