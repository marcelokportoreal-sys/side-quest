"use client";

/**
 * Dashboard do herói — a tela do jogo. Recompensa IMEDIATA e visível:
 * check-in → +XP flutuante, barra enchendo, chips pulsando, level-up.
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { type VisaoJogo, type RespostaCheckin } from "@/domain/game.service";
import { GameScene } from "@/components/pixel/GameScene";

const DOMINIO_ICONE: Record<string, string> = {
  fortuna: "🪙", mente: "📘", carreira: "💼", vigor: "🌙",
};

/** Contador que rola suavemente até o valor. */
function useContador(alvo: number): number {
  const [v, setV] = useState(alvo);
  const ref = useRef(alvo);
  useEffect(() => {
    const de = ref.current;
    ref.current = alvo;
    if (de === alvo) return;
    const t0 = performance.now();
    const dur = 700;
    let raf = 0;
    const passo = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      setV(Math.round(de + (alvo - de) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [alvo]);
  return v;
}

interface Flutuante { id: number; texto: string; epico: boolean; x: number }

export function Dashboard({ inicial }: { inicial: VisaoJogo }) {
  const [jogo, setJogo] = useState(inicial);
  const [ocupada, setOcupada] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [flutuantes, setFlutuantes] = useState<Flutuante[]>([]);
  const [bump, setBump] = useState<"ouro" | "energia" | "momentum" | null>(null);
  const [levelUp, setLevelUp] = useState(false);
  const [pulso, setPulso] = useState(0);
  const proxId = useRef(1);

  const ouro = useContador(jogo.ouro);

  function flutuar(texto: string, epico = false) {
    const id = proxId.current++;
    setFlutuantes((f) => [...f, { id, texto, epico, x: 30 + Math.random() * 40 }]);
    setTimeout(() => setFlutuantes((f) => f.filter((i) => i.id !== id)), 1200);
  }

  async function concluir(missaoId: string) {
    setOcupada(missaoId);
    setErro(null);
    const res = await fetch("/api/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ missaoId }),
    });
    setOcupada(null);
    if (!res.ok) {
      const corpo = (await res.json().catch(() => null)) as { erro?: string } | null;
      setErro(corpo?.erro ?? "erro no check-in");
      return;
    }
    const r = (await res.json()) as RespostaCheckin;
    setPulso((p) => p + 1);
    flutuar(`+${r.xpGanho} XP${r.critico ? " ✦crítico" : ""}`, r.critico);
    if (r.energiaGanha > 0) setTimeout(() => flutuar(`+${r.energiaGanha}⚡`), 250);
    setBump("energia");
    setTimeout(() => setBump(null), 450);
    if (r.levelsGanhos > 0) {
      setLevelUp(true);
      setTimeout(() => setLevelUp(false), 2200);
    }
    setJogo((j) => ({
      ...j,
      level: r.level,
      xp: r.xp,
      xpProximo: r.xpProximo,
      energia: r.energia,
      ouro: r.ouro,
      momentum: r.momentum,
      missoes: j.missoes.map((m) => (m.id === missaoId ? { ...m, concluida: true } : m)),
    }));
  }

  const pendentes = jogo.missoes.filter((m) => !m.concluida);
  const feitas = jogo.missoes.filter((m) => m.concluida);
  const pctXp = Math.min(100, Math.round((jogo.xp / jogo.xpProximo) * 100));

  return (
    <main className="sq-wrap" style={{ position: "relative" }}>
      <GameScene level={jogo.level} energia={jogo.energia} momentum={jogo.momentum} pulso={pulso} nome={jogo.nome} />

      <AnimatePresence>
        {jogo.ganhosOffline && (
          <motion.div className="sq-toast" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            🏕️ <strong>Enquanto você estava fora</strong> ({jogo.ganhosOffline.horas}h de grind):{" "}
            <span style={{ color: "var(--sq-gold)" }}>+{jogo.ganhosOffline.ouro} ouro</span>,{" "}
            +{jogo.ganhosOffline.xp} XP
            {jogo.ganhosOffline.levels > 0 && <> — e o herói subiu de level! 🎉</>}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="sq-panel" style={{ position: "relative", overflow: "visible" }}>
        {flutuantes.map((f) => (
          <span key={f.id} className={`sq-float${f.epico ? " epic" : ""}`} style={{ left: `${f.x}%`, top: 8 }}>
            {f.texto}
          </span>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: ".9rem" }}>
          <div style={{ fontSize: "2.2rem" }}>{levelUp ? "🌟" : "🧙"}</div>
          <div style={{ flex: 1 }}>
            <h1 className="sq-h1">
              {jogo.nome}{" "}
              <span style={{ color: "var(--sq-gold)", fontSize: ".95rem" }}>lv {jogo.level}</span>
            </h1>
            <div className="sq-bar" style={{ marginTop: ".45rem" }} title={`${jogo.xp}/${jogo.xpProximo} XP`}>
              <span style={{ width: `${pctXp}%` }} />
            </div>
          </div>
        </div>
        <div className="sq-res">
          <span className={`chip${bump === "ouro" ? " bump" : ""}`}>🪙 {ouro.toLocaleString("pt-BR")}</span>
          <span className={`chip${bump === "energia" ? " bump" : ""}`}>⚡ {jogo.energia}/{jogo.energiaMax}</span>
          <span className={`chip${bump === "momentum" ? " bump" : ""}`}>🔥 x{(1 + jogo.momentum * 0.1).toFixed(1)}</span>
        </div>
        <AnimatePresence>
          {levelUp && (
            <motion.p initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              style={{ color: "var(--sq-gold)", fontWeight: 700, margin: ".6rem 0 0" }}>
              ✨ LEVEL UP! O herói alcançou o nível {jogo.level}!
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {erro && <p className="sq-msg-err" style={{ marginTop: ".6rem" }}>{erro}</p>}

      <section className="sq-panel">
        <p className="sq-sub" style={{ margin: "0 0 .5rem" }}>
          ⚔️ Missões de hoje — cada uma é uma ação REAL. O herói só grinda com a sua energia.
        </p>
        {pendentes.length === 0 && (
          <p style={{ color: "var(--sq-ok)", margin: ".4rem 0" }}>
            🏆 Tudo feito por hoje. O herói grinda; você vive.
          </p>
        )}
        <AnimatePresence initial={false}>
          {pendentes.map((m) => (
            <motion.div key={m.id} className="sq-missao" layout
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: 24 }}>
              <span style={{ fontSize: "1.15rem" }}>{DOMINIO_ICONE[m.dominio] ?? "⭐"}</span>
              <div className="info">
                <div className="titulo">{m.titulo}</div>
                {m.descricao && <div className="desc">{m.descricao}</div>}
              </div>
              <span className="premio">+{m.xp}xp ⚡{m.energia}</span>
              <button className="sq-btn" disabled={ocupada === m.id} onClick={() => concluir(m.id)}>
                {ocupada === m.id ? "…" : "Feito"}
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        {feitas.length > 0 && (
          <>
            <p className="sq-sub" style={{ margin: "1rem 0 .3rem" }}>Concluídas</p>
            {feitas.map((m) => (
              <div key={m.id} className="sq-missao feita">
                <span style={{ fontSize: "1.15rem" }}>{DOMINIO_ICONE[m.dominio] ?? "⭐"}</span>
                <div className="info"><div className="titulo">{m.titulo}</div></div>
                <span className="premio">✓</span>
              </div>
            ))}
          </>
        )}
      </section>

      <section className="sq-panel" style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        {(["fortuna", "mente", "carreira", "vigor"] as const).map((d) => (
          <span key={d} className="sq-domtag">
            {DOMINIO_ICONE[d]} {d} {jogo.atributos[d]}
          </span>
        ))}
      </section>
    </main>
  );
}
