import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "README Generator",
  description: "AI-powered README.md generator for any GitHub repository.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
