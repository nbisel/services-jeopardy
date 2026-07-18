import type { Metadata, Viewport } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

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
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <Nav />
        <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6">{children}</main>
      </body>
    </html>
  );
}
