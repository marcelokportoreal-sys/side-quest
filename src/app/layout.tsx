import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Side Quest",
  description: "Temporada 1 — Em Busca da Renda Extra",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
