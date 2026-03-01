import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zrata-X — The Passive Compounder",
  description:
    "Monthly investment co-pilot for Indian working professionals. No trading. No charts. Just calm, portfolio-aware allocation.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-grain">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}