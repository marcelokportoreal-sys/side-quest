"use client";

/** Primeiro acesso: batiza o herói e começa a jornada. */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export function Onboarding() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function comecar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    const res = await fetch("/api/personagem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome }),
    });
    setCarregando(false);
    if (!res.ok) {
      const corpo = (await res.json().catch(() => null)) as { erro?: string } | null;
      setErro(corpo?.erro ?? "erro ao criar herói");
      return;
    }
    router.refresh();
  }

  return (
    <main className="sq-wrap" style={{ maxWidth: 440, paddingTop: "12vh" }}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div style={{ textAlign: "center", marginBottom: "1.2rem" }}>
          <div style={{ fontSize: "2.6rem" }}>🏘️</div>
          <h1 className="sq-h1">Vila do Cadastro</h1>
          <p className="sq-sub">
            Toda side quest começa com um nome. O seu herói vai grindar enquanto você
            executa a vida real — e só ganha energia quando VOCÊ age.
          </p>
        </div>
        <form className="sq-panel" onSubmit={comecar}>
          <div style={{ display: "grid", gap: ".7rem" }}>
            <input className="sq-input" placeholder="nome do herói (2–24)" value={nome}
              onChange={(e) => setNome(e.target.value)} minLength={2} maxLength={24} required autoFocus />
            {erro && <p className="sq-msg-err">{erro}</p>}
            <button className="sq-btn" disabled={carregando}>
              {carregando ? "…" : "Começar a Temporada 1"}
            </button>
          </div>
        </form>
      </motion.div>
    </main>
  );
}
