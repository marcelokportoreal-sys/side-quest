"use client";

/**
 * Dashboard — reimaginado no estilo Task Bar Hero: compacto, escuro, glanceable,
 * organizado em ABAS (Missões / Herói / Loja). Cabeçalho sempre visível com o
 * herói, recursos e TAXA de produção (juice de números). Recompensa imediata:
 * check-in → +XP flutuante, barras enchendo, chips pulsando, level-up.
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { type VisaoJogo, type RespostaCheckin, type RespostaEvento, type RespostaUpgrade } from "@/domain/game.service";
import { type EventoDef, type OpcaoEvento } from "@/domain/eventos";
import { GameScene } from "@/components/pixel/GameScene";

const DOMINIO_ICONE: Record<string, string> = {
  fortuna: "🪙", mente: "📘", carreira: "💼", vigor: "🌙",
};
const DOMINIO_LABEL: Record<string, string> = {
  fortuna: "Fortuna", mente: "Mente", carreira: "Carreira", vigor: "Vigor",
};

/** Presets de dificuldade — espelham RECOMPENSAS em src/domain/tarefa.ts. */
const DIFICULDADES: Array<{ id: string; nome: string; xp: number; energia: number; cor: string }> = [
  { id: "trivial", nome: "Trivial", xp: 10, energia: 6, cor: "#7c8a99" },
  { id: "leve", nome: "Leve", xp: 20, energia: 10, cor: "#4a9e5c" },
  { id: "media", nome: "Média", xp: 35, energia: 16, cor: "#c9a227" },
  { id: "desafiadora", nome: "Desafiadora", xp: 60, energia: 26, cor: "#d06a2c" },
  { id: "epica", nome: "Épica", xp: 100, energia: 40, cor: "#8b3fd0" },
];

const GOLD = "var(--sq-gold,#c9a227)";

/** Formata números grandes: 1.2K, 3.4M, 5.1B. */
function fmt(n: number): string {
  if (n === Infinity) return "—";
  if (n < 1000) return String(Math.round(n));
  const u = ["K", "M", "B", "T"];
  let v = n, i = -1;
  while (v >= 1000 && i < u.length - 1) { v /= 1000; i++; }
  return `${v.toFixed(v < 10 ? 1 : 0)}${u[i]}`;
}

interface FormTarefa {
  titulo: string;
  descricao: string;
  dominio: "fortuna" | "mente" | "carreira" | "vigor";
  tipo: "unica" | "diaria";
  dificuldade: string;
}
const FORM_VAZIO: FormTarefa = { titulo: "", descricao: "", dominio: "carreira", tipo: "diaria", dificuldade: "media" };

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
type Aba = "missoes" | "heroi" | "loja";

export function Dashboard({ inicial }: { inicial: VisaoJogo }) {
  const [jogo, setJogo] = useState(inicial);
  const [aba, setAba] = useState<Aba>("missoes");
  const [ocupada, setOcupada] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [flutuantes, setFlutuantes] = useState<Flutuante[]>([]);
  const [bump, setBump] = useState<"ouro" | "energia" | "momentum" | null>(null);
  const [levelUp, setLevelUp] = useState(false);
  const [pulso, setPulso] = useState(0);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);
  const [form, setForm] = useState<FormTarefa>(FORM_VAZIO);
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
      level: r.level, xp: r.xp, xpProximo: r.xpProximo, energia: r.energia, ouro: r.ouro, momentum: r.momentum,
      missoes: fonte === "missao" ? j.missoes.map((m) => (m.id === id ? { ...m, concluida: true } : m)) : j.missoes,
      tarefas: fonte === "tarefa" ? j.tarefas.map((t) => (t.id === id ? { ...t, concluida: true } : t)) : j.tarefas,
    }));
  }

  async function submeterTarefa() {
    const titulo = form.titulo.trim();
    if (titulo.length < 2) { setErro("dê um nome à missão (mín. 2 caracteres)"); return; }
    setCriando(true);
    setErro(null);
    const editando = editandoId != null;
    const res = await fetch("/api/tarefa", {
      method: editando ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editando ? { ...form, id: editandoId } : form),
    });
    setCriando(false);
    if (!res.ok) {
      const corpo = (await res.json().catch(() => null)) as { erro?: string } | null;
      setErro(corpo?.erro ?? "erro ao salvar missão");
      return;
    }
    const t = (await res.json()) as VisaoJogo["tarefas"][number];
    setJogo((j) => ({
      ...j,
      tarefas: editando
        ? j.tarefas.map((x) => (x.id === t.id ? { ...t, concluida: x.concluida } : x))
        : [{ ...t, concluida: false }, ...j.tarefas],
    }));
    fecharForm();
  }

  function abrirNova() { setEditandoId(null); setForm(FORM_VAZIO); setMostrarForm(true); }
  function abrirEdicao(t: VisaoJogo["tarefas"][number]) {
    setEditandoId(t.id);
    setForm({ titulo: t.titulo, descricao: t.descricao ?? "", dominio: t.dominio, tipo: t.tipo, dificuldade: t.dificuldade });
    setMostrarForm(true);
  }
  function fecharForm() { setMostrarForm(false); setEditandoId(null); setForm(FORM_VAZIO); }

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
      level: r.level, xp: r.xp, xpProximo: r.xpProximo, energia: r.energia, ouro: r.ouro, momentum: r.momentum,
      atributos: r.atributos, eventos: j.eventos.filter((e) => e.id !== evento.id),
    }));
  }

  async function comprar(id: string) {
    setOcupada(id);
    setErro(null);
    const res = await fetch("/api/upgrade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setOcupada(null);
    if (!res.ok) {
      const corpo = (await res.json().catch(() => null)) as { erro?: string } | null;
      setErro(corpo?.erro ?? "erro na compra");
      return;
    }
    const r = (await res.json()) as RespostaUpgrade;
    setBump("ouro");
    setTimeout(() => setBump(null), 450);
    flutuar("⬆️ upgrade!", true);
    setJogo((j) => ({
      ...j,
      ouro: r.ouro, energiaMax: r.energiaMax, taxa: r.taxa,
      upgrades: j.upgrades.map((u) => (u.id === r.id ? { ...u, nivel: r.nivel, custo: r.custoProximo } : u)),
    }));
  }

  const eventoAtual = jogo.eventos[0];
  const tarefasPendentes = jogo.tarefas.filter((t) => !t.concluida);
  const tarefasFeitas = jogo.tarefas.filter((t) => t.concluida);
  const missoesPendentes = jogo.missoes.filter((m) => !m.concluida);
  const pctXp = Math.min(100, Math.round((jogo.xp / jogo.xpProximo) * 100));
  const pctEnergia = Math.min(100, Math.round((jogo.energia / jogo.energiaMax) * 100));
  const difSel = DIFICULDADES.find((d) => d.id === form.dificuldade) ?? DIFICULDADES[2]!;

  const ABAS: Array<{ id: Aba; label: string; icone: string; badge?: number }> = [
    { id: "missoes", label: "Missões", icone: "🗡️", badge: tarefasPendentes.length + missoesPendentes.length },
    { id: "heroi", label: "Herói", icone: "🧙" },
    { id: "loja", label: "Loja", icone: "🏪" },
  ];

  return (
    <main className="sq-wrap" style={{ position: "relative" }}>
      <GameScene level={jogo.level} energia={jogo.energia} momentum={jogo.momentum} pulso={pulso} nome={jogo.nome} />

      <motion.div className="sq-toast" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        🏕️ {jogo.frase}
      </motion.div>

      <AnimatePresence>
        {eventoAtual && (
          <motion.div className="sq-panel" style={{ borderColor: GOLD }}
            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <p className="sq-sub" style={{ margin: "0 0 .2rem", color: GOLD }}>✨ Um momento de escolha — {jogo.estagio.nome}</p>
            <h2 className="sq-h1" style={{ fontSize: "1.1rem" }}>{eventoAtual.titulo}</h2>
            <p style={{ margin: ".4rem 0 .8rem" }}>{eventoAtual.texto}</p>
            <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap" }}>
              {eventoAtual.opcoes.map((o) => (
                <button key={o.id} className="sq-btn" disabled={ocupada === eventoAtual.id} onClick={() => resolver(eventoAtual, o)}>
                  {o.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── CABEÇALHO (sempre visível) ─── */}
      <div className="sq-panel" style={{ position: "relative", overflow: "visible", paddingBottom: ".7rem" }}>
        {flutuantes.map((f) => (
          <span key={f.id} className={`sq-float${f.epico ? " epic" : ""}`} style={{ left: `${f.x}%`, top: 8 }}>{f.texto}</span>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: ".7rem" }}>
          <div style={{ fontSize: "1.9rem" }}>{levelUp ? "🌟" : "🧙"}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className="sq-h1" style={{ fontSize: "1.05rem" }}>
              {jogo.nome}{" "}
              <span style={{ color: GOLD, fontSize: ".85rem" }}>lv {jogo.level}</span>{" "}
              <span style={{ color: "var(--sq-muted,#9a90b0)", fontSize: ".75rem" }}>· {jogo.estagio.nome}</span>
            </h1>
            <div className="sq-bar" style={{ marginTop: ".35rem" }} title={`${jogo.xp}/${jogo.xpProximo} XP`}>
              <span style={{ width: `${pctXp}%` }} />
            </div>
          </div>
        </div>

        {/* Recursos + TAXA (juice) */}
        <div className="sq-res" style={{ marginTop: ".6rem" }}>
          <span className={`chip${bump === "ouro" ? " bump" : ""}`} title={`${jogo.ouro} de ouro`}>
            🪙 {fmt(ouro)} <em style={{ opacity: .6, fontStyle: "normal", fontSize: ".75em" }}>+{fmt(jogo.taxa.ouroHora)}/h</em>
          </span>
          <span className={`chip${bump === "energia" ? " bump" : ""}`}>⚡ {jogo.energia}/{jogo.energiaMax}</span>
          <span className={`chip${bump === "momentum" ? " bump" : ""}`} title="multiplicador por dias seguidos">🔥 x{(1 + jogo.momentum * 0.1).toFixed(1)}</span>
        </div>
        <div className="sq-bar" style={{ marginTop: ".4rem", height: 5, opacity: .85 }} title={`energia ${jogo.energia}/${jogo.energiaMax}`}>
          <span style={{ width: `${pctEnergia}%`, background: "linear-gradient(90deg,#3aa0ff,#7ad0ff)" }} />
        </div>

        <AnimatePresence>
          {levelUp && (
            <motion.p initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              style={{ color: GOLD, fontWeight: 700, margin: ".5rem 0 0", fontSize: ".9rem" }}>
              ✨ LEVEL UP! Nível {jogo.level}!
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* ─── ABAS ─── */}
      <div style={{ display: "flex", gap: ".3rem", margin: ".2rem 0 .1rem" }}>
        {ABAS.map((t) => (
          <button key={t.id} onClick={() => setAba(t.id)}
            style={{
              flex: 1, padding: ".5rem .3rem", borderRadius: "10px 10px 0 0", cursor: "pointer",
              border: "1px solid rgba(255,255,255,.1)", borderBottom: aba === t.id ? `2px solid ${GOLD}` : "1px solid rgba(255,255,255,.1)",
              background: aba === t.id ? "rgba(201,162,39,.14)" : "transparent",
              color: "inherit", fontWeight: aba === t.id ? 700 : 400, fontSize: ".85rem", position: "relative",
            }}>
            {t.icone} {t.label}
            {t.badge != null && t.badge > 0 && (
              <span style={{ marginLeft: ".3rem", fontSize: ".7rem", background: GOLD, color: "#1a1420", borderRadius: 999, padding: "0 .35rem", fontWeight: 700 }}>{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {erro && <p className="sq-msg-err" style={{ margin: ".3rem 0" }}>{erro}</p>}

      {/* ─── ABA: MISSÕES ─── */}
      {aba === "missoes" && (
        <section className="sq-panel">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: ".5rem", marginBottom: ".5rem" }}>
            <p className="sq-sub" style={{ margin: 0 }}>🗡️ Suas missões — o que VOCÊ precisa fazer.</p>
            <button className="sq-btn" onClick={() => (mostrarForm ? fecharForm() : abrirNova())}
              style={{ background: mostrarForm ? "transparent" : `linear-gradient(180deg,${GOLD},#a8791b)`,
                color: mostrarForm ? GOLD : "#1a1420", border: `1px solid ${GOLD}`, fontWeight: 700, whiteSpace: "nowrap" }}>
              {mostrarForm ? "✕ Fechar" : "➕ Nova"}
            </button>
          </div>

          <AnimatePresence initial={false}>
            {mostrarForm && (
              <motion.div key="form" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
                <div style={{ border: "1px solid rgba(201,162,39,.35)", borderRadius: 10, padding: ".8rem", background: "rgba(201,162,39,.06)", marginBottom: ".7rem" }}>
                  {editandoId && <div style={{ fontSize: ".72rem", color: GOLD, marginBottom: ".4rem" }}>✏️ Editando missão</div>}
                  <input autoFocus placeholder="Ex.: Enviar 3 candidaturas, Treino 30min…" value={form.titulo} maxLength={80}
                    onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === "Enter") submeterTarefa(); }}
                    style={{ width: "100%", padding: ".55rem .7rem", borderRadius: 8, marginBottom: ".7rem",
                      background: "rgba(0,0,0,.25)", border: "1px solid rgba(255,255,255,.12)", color: "inherit", fontSize: ".92rem" }} />

                  <div style={{ fontSize: ".7rem", opacity: .8, marginBottom: ".3rem" }}>ATRIBUTO QUE FORTALECE</div>
                  <div style={{ display: "flex", gap: ".35rem", flexWrap: "wrap", marginBottom: ".6rem" }}>
                    {(["fortuna", "mente", "carreira", "vigor"] as const).map((d) => (
                      <button key={d} type="button" onClick={() => setForm((f) => ({ ...f, dominio: d }))}
                        style={{ padding: ".3rem .55rem", borderRadius: 999, cursor: "pointer",
                          border: `1px solid ${form.dominio === d ? GOLD : "rgba(255,255,255,.15)"}`,
                          background: form.dominio === d ? "rgba(201,162,39,.18)" : "transparent",
                          color: "inherit", fontSize: ".8rem", fontWeight: form.dominio === d ? 700 : 400 }}>
                        {DOMINIO_ICONE[d]} {DOMINIO_LABEL[d]}
                      </button>
                    ))}
                  </div>

                  <div style={{ fontSize: ".7rem", opacity: .8, marginBottom: ".3rem" }}>RECORRÊNCIA</div>
                  <div style={{ display: "flex", gap: ".35rem", marginBottom: ".6rem" }}>
                    {([["diaria", "🔁 Diária"], ["unica", "🎯 Única"]] as const).map(([id, label]) => (
                      <button key={id} type="button" onClick={() => setForm((f) => ({ ...f, tipo: id }))}
                        style={{ padding: ".3rem .55rem", borderRadius: 8, cursor: "pointer", flex: 1,
                          border: `1px solid ${form.tipo === id ? GOLD : "rgba(255,255,255,.15)"}`,
                          background: form.tipo === id ? "rgba(201,162,39,.18)" : "transparent",
                          color: "inherit", fontSize: ".8rem", fontWeight: form.tipo === id ? 700 : 400 }}>
                        {label}
                      </button>
                    ))}
                  </div>

                  <div style={{ fontSize: ".7rem", opacity: .8, marginBottom: ".3rem" }}>DIFICULDADE → RECOMPENSA</div>
                  <div style={{ display: "flex", gap: ".3rem", flexWrap: "wrap", marginBottom: ".6rem" }}>
                    {DIFICULDADES.map((d) => (
                      <button key={d.id} type="button" onClick={() => setForm((f) => ({ ...f, dificuldade: d.id }))}
                        style={{ padding: ".28rem .5rem", borderRadius: 8, cursor: "pointer",
                          border: `1px solid ${form.dificuldade === d.id ? d.cor : "rgba(255,255,255,.15)"}`,
                          background: form.dificuldade === d.id ? `${d.cor}33` : "transparent",
                          color: "inherit", fontSize: ".78rem", fontWeight: form.dificuldade === d.id ? 700 : 400 }}>
                        {d.nome}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: ".6rem" }}>
                    <span style={{ fontSize: ".82rem" }}>
                      <strong style={{ color: GOLD }}>+{difSel.xp} XP</strong> · <strong>⚡{difSel.energia}</strong> · +1 {DOMINIO_LABEL[form.dominio]}
                    </span>
                    <button className="sq-btn" disabled={criando || form.titulo.trim().length < 2} onClick={submeterTarefa}
                      style={{ background: `linear-gradient(180deg,${GOLD},#a8791b)`, color: "#1a1420", fontWeight: 700 }}>
                      {criando ? "…" : editandoId ? "Salvar" : "Forjar"}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {tarefasPendentes.length === 0 && tarefasFeitas.length === 0 && !mostrarForm && (
            <p style={{ opacity: .75, margin: ".2rem 0", fontSize: ".88rem" }}>
              Nenhuma missão sua ainda. Toque em <strong>➕ Nova</strong> e vire sua rotina em progresso.
            </p>
          )}

          <AnimatePresence initial={false}>
            {tarefasPendentes.map((t) => (
              <motion.div key={t.id} className="sq-missao" layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 24 }}>
                <span style={{ fontSize: "1.1rem" }}>{DOMINIO_ICONE[t.dominio] ?? "⭐"}</span>
                <div className="info">
                  <div className="titulo">{t.titulo} <span style={{ fontSize: ".7rem", opacity: .6 }}>{t.tipo === "diaria" ? "🔁" : "🎯"}</span></div>
                  {t.descricao && <div className="desc">{t.descricao}</div>}
                </div>
                <span className="premio">+{t.xp}xp ⚡{t.energia}</span>
                <button className="sq-btn" disabled={ocupada === t.id} onClick={() => concluir(t.id, "tarefa")}>{ocupada === t.id ? "…" : "Feito"}</button>
                <button onClick={() => abrirEdicao(t)} title="Editar" style={{ background: "none", border: "none", color: "inherit", opacity: .45, cursor: "pointer", fontSize: ".95rem", padding: "0 .15rem" }}>✏️</button>
                <button onClick={() => arquivar(t.id)} title="Remover" style={{ background: "none", border: "none", color: "inherit", opacity: .4, cursor: "pointer", fontSize: ".95rem", padding: "0 .15rem" }}>🗑️</button>
              </motion.div>
            ))}
          </AnimatePresence>

          {tarefasFeitas.length > 0 && (
            <>
              <p className="sq-sub" style={{ margin: ".8rem 0 .3rem" }}>Concluídas hoje</p>
              {tarefasFeitas.map((t) => (
                <div key={t.id} className="sq-missao feita">
                  <span style={{ fontSize: "1.1rem" }}>{DOMINIO_ICONE[t.dominio] ?? "⭐"}</span>
                  <div className="info"><div className="titulo">{t.titulo}</div></div>
                  <span className="premio">✓</span>
                </div>
              ))}
            </>
          )}

          {missoesPendentes.length > 0 && (
            <>
              <p className="sq-sub" style={{ margin: "1rem 0 .3rem" }}>⚔️ Campanha da Temporada</p>
              <AnimatePresence initial={false}>
                {missoesPendentes.map((m) => (
                  <motion.div key={m.id} className="sq-missao" layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: 24 }}>
                    <span style={{ fontSize: "1.1rem" }}>{DOMINIO_ICONE[m.dominio] ?? "⭐"}</span>
                    <div className="info">
                      <div className="titulo">{m.titulo}</div>
                      {m.descricao && <div className="desc">{m.descricao}</div>}
                    </div>
                    <span className="premio">+{m.xp}xp ⚡{m.energia}</span>
                    <button className="sq-btn" disabled={ocupada === m.id} onClick={() => concluir(m.id, "missao")}>{ocupada === m.id ? "…" : "Feito"}</button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </>
          )}
        </section>
      )}

      {/* ─── ABA: HERÓI ─── */}
      {aba === "heroi" && (
        <section className="sq-panel">
          <p className="sq-sub" style={{ margin: "0 0 .5rem" }}>🧙 {jogo.nome} — {jogo.estagio.nome} <span style={{ opacity: .6 }}>({jogo.estagio.sub})</span></p>
          <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap", marginBottom: ".7rem" }}>
            {(["fortuna", "mente", "carreira", "vigor"] as const).map((d) => (
              <span key={d} className="sq-domtag" title={DOMINIO_LABEL[d]}>{DOMINIO_ICONE[d]} {DOMINIO_LABEL[d]} <strong>{jogo.atributos[d]}</strong></span>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".5rem", fontSize: ".85rem" }}>
            <div className="chip" style={{ justifyContent: "flex-start" }}>🪙 Produção: <strong style={{ marginLeft: ".3rem", color: GOLD }}>+{fmt(jogo.taxa.ouroHora)}/h</strong></div>
            <div className="chip" style={{ justifyContent: "flex-start" }}>📘 XP: <strong style={{ marginLeft: ".3rem" }}>+{fmt(jogo.taxa.xpHora)}/h</strong></div>
            <div className="chip" style={{ justifyContent: "flex-start" }}>⚡ Energia: <strong style={{ marginLeft: ".3rem" }}>{jogo.energia}/{jogo.energiaMax}</strong></div>
            <div className="chip" style={{ justifyContent: "flex-start" }}>🔥 Momentum: <strong style={{ marginLeft: ".3rem" }}>x{(1 + jogo.momentum * 0.1).toFixed(1)}</strong></div>
          </div>
          <p style={{ fontSize: ".82rem", opacity: .85, marginTop: ".8rem" }}>🏕️ {jogo.frase}</p>
        </section>
      )}

      {/* ─── ABA: LOJA ─── */}
      {aba === "loja" && (
        <section className="sq-panel">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: ".5rem" }}>
            <p className="sq-sub" style={{ margin: 0 }}>🏪 Forja — gaste ouro para o herói produzir mais.</p>
            <span className="chip">🪙 {fmt(ouro)}</span>
          </div>
          {jogo.upgrades.map((u) => {
            const maxado = u.nivel >= u.nivelMax;
            const podeComprar = !maxado && jogo.ouro >= u.custo;
            return (
              <div key={u.id} className="sq-missao">
                <span style={{ fontSize: "1.2rem" }}>{u.icone}</span>
                <div className="info">
                  <div className="titulo">{u.nome} <span style={{ fontSize: ".72rem", opacity: .6 }}>nv {u.nivel}{u.nivelMax ? `/${u.nivelMax}` : ""}</span></div>
                  <div className="desc">{u.descricao}</div>
                </div>
                <button className="sq-btn" disabled={ocupada === u.id || !podeComprar}
                  onClick={() => comprar(u.id)}
                  style={{ opacity: podeComprar ? 1 : .5, background: podeComprar ? `linear-gradient(180deg,${GOLD},#a8791b)` : undefined, color: podeComprar ? "#1a1420" : undefined, fontWeight: 700, whiteSpace: "nowrap" }}>
                  {maxado ? "MÁX" : ocupada === u.id ? "…" : `🪙 ${fmt(u.custo)}`}
                </button>
              </div>
            );
          })}
        </section>
      )}
    </main>
  );
}
