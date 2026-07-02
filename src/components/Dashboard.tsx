"use client";

/**
 * Dashboard do herói — a tela do jogo. Recompensa IMEDIATA e visível:
 * check-in → +XP flutuante, barra enchendo, chips pulsando, level-up.
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { type VisaoJogo, type RespostaCheckin, type RespostaEvento } from "@/domain/game.service";
import { type EventoDef, type OpcaoEvento } from "@/domain/eventos";
import { GameScene } from "@/components/pixel/GameScene";

const DOMINIO_ICONE: Record<string, string> = {
  fortuna: "🪙", mente: "📘", carreira: "💼", vigor: "🌙",
};

const DOMINIO_LABEL: Record<string, string> = {
  fortuna: "Fortuna", mente: "Mente", carreira: "Carreira", vigor: "Vigor",
};

/** Presets de dificuldade — devem espelhar RECOMPENSAS em src/domain/tarefa.ts. */
const DIFICULDADES: Array<{ id: string; nome: string; xp: number; energia: number; cor: string }> = [
  { id: "trivial", nome: "Trivial", xp: 10, energia: 6, cor: "#7c8a99" },
  { id: "leve", nome: "Leve", xp: 20, energia: 10, cor: "#4a9e5c" },
  { id: "media", nome: "Média", xp: 35, energia: 16, cor: "#c9a227" },
  { id: "desafiadora", nome: "Desafiadora", xp: 60, energia: 26, cor: "#d06a2c" },
  { id: "epica", nome: "Épica", xp: 100, energia: 40, cor: "#8b3fd0" },
];

interface FormTarefa {
  titulo: string;
  descricao: string;
  dominio: "fortuna" | "mente" | "carreira" | "vigor";
  tipo: "unica" | "diaria";
  dificuldade: string;
}

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
  const [mostrarForm, setMostrarForm] = useState(false);
  const [criando, setCriando] = useState(false);
  const [form, setForm] = useState<FormTarefa>({
    titulo: "", descricao: "", dominio: "carreira", tipo: "diaria", dificuldade: "media",
  });
  const proxId = useRef(1);

  const ouro = useContador(jogo.ouro);

  function flutuar(texto: string, epico = false) {
    const id = proxId.current++;
    setFlutuantes((f) => [...f, { id, texto, epico, x: 30 + Math.random() * 40 }]);
    setTimeout(() => setFlutuantes((f) => f.filter((i) => i.id !== id)), 1200);
  }

  async function concluir(id: string, fonte: "missao" | "tarefa") {
    setOcupada(id);
    setErro(null);
    const res = await fetch("/api/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fonte === "tarefa" ? { tarefaId: id } : { missaoId: id }),
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
      missoes: fonte === "missao" ? j.missoes.map((m) => (m.id === id ? { ...m, concluida: true } : m)) : j.missoes,
      tarefas: fonte === "tarefa" ? j.tarefas.map((t) => (t.id === id ? { ...t, concluida: true } : t)) : j.tarefas,
    }));
  }

  async function criarNovaTarefa() {
    const titulo = form.titulo.trim();
    if (titulo.length < 2) { setErro("dê um nome à missão (mín. 2 caracteres)"); return; }
    setCriando(true);
    setErro(null);
    const res = await fetch("/api/tarefa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setCriando(false);
    if (!res.ok) {
      const corpo = (await res.json().catch(() => null)) as { erro?: string } | null;
      setErro(corpo?.erro ?? "erro ao criar missão");
      return;
    }
    const nova = (await res.json()) as VisaoJogo["tarefas"][number];
    setJogo((j) => ({ ...j, tarefas: [{ ...nova, concluida: false }, ...j.tarefas] }));
    setForm({ titulo: "", descricao: "", dominio: "carreira", tipo: "diaria", dificuldade: "media" });
    setMostrarForm(false);
  }

  async function arquivar(id: string) {
    setJogo((j) => ({ ...j, tarefas: j.tarefas.filter((t) => t.id !== id) }));
    await fetch(`/api/tarefa?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
  }

  async function resolver(evento: EventoDef, opcao: OpcaoEvento) {
    setOcupada(evento.id);
    setErro(null);
    const res = await fetch("/api/evento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventoId: evento.id, opcaoId: opcao.id }),
    });
    setOcupada(null);
    if (!res.ok) {
      const corpo = (await res.json().catch(() => null)) as { erro?: string } | null;
      setErro(corpo?.erro ?? "erro ao resolver evento");
      return;
    }
    const r = (await res.json()) as RespostaEvento;
    setPulso((p) => p + 1);
    setJogo((j) => ({
      ...j,
      level: r.level,
      xp: r.xp,
      xpProximo: r.xpProximo,
      energia: r.energia,
      ouro: r.ouro,
      momentum: r.momentum,
      atributos: r.atributos,
      eventos: j.eventos.filter((e) => e.id !== evento.id),
    }));
  }

  const eventoAtual = jogo.eventos[0];
  const pendentes = jogo.missoes.filter((m) => !m.concluida);
  const feitas = jogo.missoes.filter((m) => m.concluida);
  const tarefasPendentes = jogo.tarefas.filter((t) => !t.concluida);
  const tarefasFeitas = jogo.tarefas.filter((t) => t.concluida);
  const pctXp = Math.min(100, Math.round((jogo.xp / jogo.xpProximo) * 100));
  const difSel = DIFICULDADES.find((d) => d.id === form.dificuldade) ?? DIFICULDADES[2]!;

  return (
    <main className="sq-wrap" style={{ position: "relative" }}>
      <GameScene level={jogo.level} energia={jogo.energia} momentum={jogo.momentum} pulso={pulso} nome={jogo.nome} />

      <motion.div className="sq-toast" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        🏕️ {jogo.frase}
      </motion.div>

      <AnimatePresence>
        {eventoAtual && (
          <motion.div className="sq-panel" style={{ borderColor: "var(--sq-gold)" }}
            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <p className="sq-sub" style={{ margin: "0 0 .2rem", color: "var(--sq-gold)" }}>
              ✨ Um momento de escolha — {jogo.estagio.nome}
            </p>
            <h2 className="sq-h1" style={{ fontSize: "1.1rem" }}>{eventoAtual.titulo}</h2>
            <p style={{ margin: ".4rem 0 .8rem" }}>{eventoAtual.texto}</p>
            <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap" }}>
              {eventoAtual.opcoes.map((o) => (
                <button key={o.id} className="sq-btn" disabled={ocupada === eventoAtual.id}
                  onClick={() => resolver(eventoAtual, o)}>
                  {o.label}
                </button>
              ))}
            </div>
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
              <span style={{ color: "var(--sq-gold)", fontSize: ".95rem" }}>lv {jogo.level}</span>{" "}
              <span style={{ color: "var(--sq-muted, #9a90b0)", fontSize: ".8rem" }}>· {jogo.estagio.nome}</span>
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

      {/* ─────────── SUAS MISSÕES (todo list do usuário) ─────────── */}
      <section className="sq-panel">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: ".5rem", marginBottom: ".5rem" }}>
          <p className="sq-sub" style={{ margin: 0 }}>🗡️ Suas missões — o que VOCÊ precisa fazer na vida real.</p>
          <button
            className="sq-btn"
            onClick={() => setMostrarForm((v) => !v)}
            style={{
              background: mostrarForm ? "transparent" : "linear-gradient(180deg,var(--sq-gold,#c9a227),#a8791b)",
              color: mostrarForm ? "var(--sq-gold,#c9a227)" : "#1a1420",
              border: "1px solid var(--sq-gold,#c9a227)", fontWeight: 700, whiteSpace: "nowrap",
            }}
          >
            {mostrarForm ? "✕ Fechar" : "➕ Nova missão"}
          </button>
        </div>

        <AnimatePresence initial={false}>
          {mostrarForm && (
            <motion.div
              key="form"
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              style={{ overflow: "hidden" }}
            >
              <div style={{
                border: "1px solid rgba(201,162,39,.35)", borderRadius: 10, padding: ".8rem",
                background: "rgba(201,162,39,.06)", marginBottom: ".7rem",
              }}>
                <input
                  className="sq-input"
                  autoFocus
                  placeholder="Ex.: Enviar 3 candidaturas, Treino de 30min, Estudar Rust…"
                  value={form.titulo}
                  maxLength={80}
                  onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter") criarNovaTarefa(); }}
                  style={{ width: "100%", padding: ".6rem .7rem", borderRadius: 8, marginBottom: ".7rem",
                    background: "rgba(0,0,0,.25)", border: "1px solid rgba(255,255,255,.12)", color: "inherit", fontSize: ".95rem" }}
                />

                <div style={{ fontSize: ".72rem", opacity: .8, marginBottom: ".3rem" }}>ATRIBUTO QUE ESTA MISSÃO FORTALECE</div>
                <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap", marginBottom: ".7rem" }}>
                  {(["fortuna", "mente", "carreira", "vigor"] as const).map((d) => (
                    <button key={d} type="button"
                      onClick={() => setForm((f) => ({ ...f, dominio: d }))}
                      style={{
                        padding: ".35rem .6rem", borderRadius: 999, cursor: "pointer",
                        border: `1px solid ${form.dominio === d ? "var(--sq-gold,#c9a227)" : "rgba(255,255,255,.15)"}`,
                        background: form.dominio === d ? "rgba(201,162,39,.18)" : "transparent",
                        color: "inherit", fontSize: ".82rem", fontWeight: form.dominio === d ? 700 : 400,
                      }}>
                      {DOMINIO_ICONE[d]} {DOMINIO_LABEL[d]}
                    </button>
                  ))}
                </div>

                <div style={{ fontSize: ".72rem", opacity: .8, marginBottom: ".3rem" }}>RECORRÊNCIA</div>
                <div style={{ display: "flex", gap: ".4rem", marginBottom: ".7rem" }}>
                  {([["diaria", "🔁 Diária (repete todo dia)"], ["unica", "🎯 Única (uma vez)"]] as const).map(([id, label]) => (
                    <button key={id} type="button"
                      onClick={() => setForm((f) => ({ ...f, tipo: id }))}
                      style={{
                        padding: ".35rem .6rem", borderRadius: 8, cursor: "pointer", flex: 1,
                        border: `1px solid ${form.tipo === id ? "var(--sq-gold,#c9a227)" : "rgba(255,255,255,.15)"}`,
                        background: form.tipo === id ? "rgba(201,162,39,.18)" : "transparent",
                        color: "inherit", fontSize: ".82rem", fontWeight: form.tipo === id ? 700 : 400,
                      }}>
                      {label}
                    </button>
                  ))}
                </div>

                <div style={{ fontSize: ".72rem", opacity: .8, marginBottom: ".3rem" }}>DIFICULDADE → RECOMPENSA</div>
                <div style={{ display: "flex", gap: ".35rem", flexWrap: "wrap", marginBottom: ".7rem" }}>
                  {DIFICULDADES.map((d) => (
                    <button key={d.id} type="button"
                      onClick={() => setForm((f) => ({ ...f, dificuldade: d.id }))}
                      style={{
                        padding: ".3rem .55rem", borderRadius: 8, cursor: "pointer",
                        border: `1px solid ${form.dificuldade === d.id ? d.cor : "rgba(255,255,255,.15)"}`,
                        background: form.dificuldade === d.id ? `${d.cor}33` : "transparent",
                        color: "inherit", fontSize: ".8rem", fontWeight: form.dificuldade === d.id ? 700 : 400,
                      }}>
                      {d.nome}
                    </button>
                  ))}
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: ".6rem" }}>
                  <span style={{ fontSize: ".85rem" }}>
                    Recompensa: <strong style={{ color: "var(--sq-gold,#c9a227)" }}>+{difSel.xp} XP</strong> · <strong>⚡{difSel.energia}</strong> · +1 {DOMINIO_LABEL[form.dominio]}
                  </span>
                  <button className="sq-btn" disabled={criando || form.titulo.trim().length < 2}
                    onClick={criarNovaTarefa}
                    style={{ background: "linear-gradient(180deg,var(--sq-gold,#c9a227),#a8791b)", color: "#1a1420", fontWeight: 700 }}>
                    {criando ? "…" : "Forjar missão"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {tarefasPendentes.length === 0 && tarefasFeitas.length === 0 && !mostrarForm && (
          <p style={{ opacity: .75, margin: ".2rem 0", fontSize: ".9rem" }}>
            Nenhuma missão sua ainda. Toque em <strong>➕ Nova missão</strong> e transforme sua rotina em progresso.
          </p>
        )}

        <AnimatePresence initial={false}>
          {tarefasPendentes.map((t) => (
            <motion.div key={t.id} className="sq-missao" layout
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 24 }}>
              <span style={{ fontSize: "1.15rem" }}>{DOMINIO_ICONE[t.dominio] ?? "⭐"}</span>
              <div className="info">
                <div className="titulo">
                  {t.titulo}{" "}
                  <span style={{ fontSize: ".7rem", opacity: .6 }}>{t.tipo === "diaria" ? "🔁" : "🎯"}</span>
                </div>
                {t.descricao && <div className="desc">{t.descricao}</div>}
              </div>
              <span className="premio">+{t.xp}xp ⚡{t.energia}</span>
              <button className="sq-btn" disabled={ocupada === t.id} onClick={() => concluir(t.id, "tarefa")}>
                {ocupada === t.id ? "…" : "Feito"}
              </button>
              <button
                onClick={() => arquivar(t.id)}
                title="Remover missão"
                style={{ background: "none", border: "none", color: "inherit", opacity: .4, cursor: "pointer", fontSize: "1rem", padding: "0 .2rem" }}
              >
                🗑️
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {tarefasFeitas.length > 0 && (
          <>
            <p className="sq-sub" style={{ margin: "1rem 0 .3rem" }}>Concluídas hoje</p>
            {tarefasFeitas.map((t) => (
              <div key={t.id} className="sq-missao feita">
                <span style={{ fontSize: "1.15rem" }}>{DOMINIO_ICONE[t.dominio] ?? "⭐"}</span>
                <div className="info"><div className="titulo">{t.titulo}</div></div>
                <span className="premio">✓</span>
              </div>
            ))}
          </>
        )}
      </section>

      {/* ─────────── CAMPANHA (missões seedadas da temporada) ─────────── */}
      <section className="sq-panel">
        <p className="sq-sub" style={{ margin: "0 0 .5rem" }}>
          ⚔️ Campanha da Temporada — missões-guia do enredo. O herói só grinda com a sua energia.
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
              <button className="sq-btn" disabled={ocupada === m.id} onClick={() => concluir(m.id, "missao")}>
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
