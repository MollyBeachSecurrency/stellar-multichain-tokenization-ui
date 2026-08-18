import React from "react";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DTCC Tokenization Platform",
  description: "Multi-chain institutional tokenization frontend supporting Ethereum and Stellar",
};

/**
 * Root layout wraps all pages with the AppProviders.
 * The providers are loaded in a client component (ClientLayout)
 * since Next.js app router layouts are server components by default.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
