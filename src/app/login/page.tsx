"use client";

/** Login/registro — e-mail e senha (jogador único, mas auth de verdade). */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const acao =
      modo === "entrar"
        ? supabase.auth.signInWithPassword({ email, password: senha })
        : supabase.auth.signUp({ email, password: senha });
    const { error } = await acao;
    setCarregando(false);
    if (error) {
      setErro(error.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="sq-wrap" style={{ maxWidth: 400, paddingTop: "14vh" }}>
      <div style={{ textAlign: "center", marginBottom: "1.2rem" }}>
        <div style={{ fontSize: "2.4rem" }}>⚔️</div>
        <h1 className="sq-h1">Side Quest</h1>
        <p className="sq-sub">Temporada 1 — Em Busca da Renda Extra</p>
      </div>
      <form className="sq-panel" onSubmit={enviar}>
        <div style={{ display: "grid", gap: ".7rem" }}>
          <input className="sq-input" type="email" placeholder="e-mail" value={email}
            onChange={(e) => setEmail(e.target.value)} required autoFocus />
          <input className="sq-input" type="password" placeholder="senha" value={senha}
            onChange={(e) => setSenha(e.target.value)} required minLength={8} />
          {erro && <p className="sq-msg-err">{erro}</p>}
          <button className="sq-btn" disabled={carregando}>
            {carregando ? "…" : modo === "entrar" ? "Entrar no mundo" : "Criar conta"}
          </button>
          <button type="button" className="sq-btn ghost"
            onClick={() => setModo(modo === "entrar" ? "criar" : "entrar")}>
            {modo === "entrar" ? "Primeira vez? Criar conta" : "Já tenho conta"}
          </button>
        </div>
      </form>
    </main>
  );
}
