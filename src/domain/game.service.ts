/**
 * Serviço do jogo: orquestra engine puro + persistência (Supabase com RLS).
 * O tick roda na LEITURA (delta desde last_tick) — sem cron.
 */

import { type SupabaseClient } from "@supabase/supabase-js";
import {
  tick,
  aplicarCheckin,
  diaLocal,
  energiaMaxima,
  xpParaProximoLevel,
  type EstadoPersonagem,
  type Dominio,
} from "./engine";
import { estagioAtual } from "./estagios";
import { eventosDisparados, type EventoDef, type OpcaoEvento } from "./eventos";
import { aplicarEfeitos } from "./efeitos";
import { fraseDoDia } from "./narrativa";

export interface PersonagemRow {
  user_id: string;
  nome: string;
  level: number;
  xp: number;
  ouro: number;
  energia: number | string;
  momentum: number;
  fortuna: number;
  mente: number;
  carreira: number;
  vigor: number;
  last_tick: string;
  ultimo_checkin_dia: string | null;
  sistemas: Record<string, unknown> | null;
}

export interface MissaoRow {
  id: string;
  zona_id: number | null;
  dominio: Dominio;
  titulo: string;
  descricao: string | null;
  tipo: "unica" | "diaria";
  xp: number;
  energia: number;
  ordem: number;
}

export interface VisaoJogo {
  nome: string;
  level: number;
  xp: number;
  xpProximo: number;
  ouro: number;
  energia: number;
  energiaMax: number;
  momentum: number;
  atributos: { fortuna: number; mente: number; carreira: number; vigor: number };
  ganhosOffline: { ouro: number; xp: number; levels: number; horas: number } | null;
  missoes: Array<MissaoRow & { concluida: boolean }>;
  estagio: { ordem: number; nome: string; sub: string };
  frase: string;
  eventos: EventoDef[];
}

function paraEstado(r: PersonagemRow): EstadoPersonagem {
  return {
    level: r.level,
    xp: Number(r.xp),
    ouro: Number(r.ouro),
    energia: Number(r.energia),
    momentum: r.momentum,
    atributos: { fortuna: r.fortuna, mente: r.mente, carreira: r.carreira, vigor: r.vigor },
    lastTick: new Date(r.last_tick),
    ultimoCheckinDia: r.ultimo_checkin_dia,
    sistemas: r.sistemas ?? {},
  };
}

function paraUpdate(e: EstadoPersonagem) {
  return {
    level: e.level,
    xp: e.xp,
    ouro: e.ouro,
    energia: e.energia,
    momentum: e.momentum,
    fortuna: e.atributos.fortuna,
    mente: e.atributos.mente,
    carreira: e.atributos.carreira,
    vigor: e.atributos.vigor,
    last_tick: e.lastTick.toISOString(),
    ultimo_checkin_dia: e.ultimoCheckinDia,
    sistemas: e.sistemas,
    updated_at: new Date().toISOString(),
  };
}

/** Carrega as defs de eventos ativas (conteúdo global). */
export async function obterEventosDef(db: SupabaseClient): Promise<EventoDef[]> {
  const { data, error } = await db.from("evento_def").select("*").eq("ativo", true);
  if (error) throw new Error(`evento_def: ${error.message}`);
  return (data ?? []).map((r) => ({
    id: r.id as string,
    gatilho: r.gatilho,
    titulo: r.titulo as string,
    texto: r.texto as string,
    opcoes: r.opcoes,
    unico: r.unico as boolean,
  }));
}

export async function obterPersonagem(db: SupabaseClient, userId: string): Promise<PersonagemRow | null> {
  const { data, error } = await db.from("personagem").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(`obter personagem: ${error.message}`);
  return data as PersonagemRow | null;
}

export async function criarPersonagem(db: SupabaseClient, userId: string, nome: string): Promise<void> {
  const { error } = await db.from("personagem").insert({ user_id: userId, nome });
  if (error) throw new Error(`criar personagem: ${error.message}`);
}

/** Carrega o jogo: aplica o tick offline, persiste e monta a visão da tela. */
export async function carregarJogo(db: SupabaseClient, userId: string, agora = new Date()): Promise<VisaoJogo | null> {
  const row = await obterPersonagem(db, userId);
  if (!row) return null;

  const r = tick(paraEstado(row), agora);
  const houveGanho = r.ouroGanho > 0 || r.xpGanho > 0;
  if (houveGanho || r.estado.momentum !== row.momentum) {
    const { error } = await db.from("personagem").update(paraUpdate(r.estado)).eq("user_id", userId);
    if (error) throw new Error(`tick: ${error.message}`);
  }

  const { data: missoes, error: em } = await db
    .from("missao").select("*").eq("ativa", true).order("ordem");
  if (em) throw new Error(`missões: ${em.message}`);

  const hoje = diaLocal(agora);
  const { data: checks, error: ec } = await db
    .from("checkin").select("missao_id, dia").eq("user_id", userId);
  if (ec) throw new Error(`checkins: ${ec.message}`);

  const feitasHoje = new Set(
    (checks ?? []).filter((c) => c.dia === hoje).map((c) => c.missao_id as string),
  );
  const feitasSempre = new Set((checks ?? []).map((c) => c.missao_id as string));

  const eventosDef = await obterEventosDef(db);
  const { data: resolvidos, error: er } = await db
    .from("evento_resolvido").select("evento_id").eq("user_id", userId);
  if (er) throw new Error(`eventos resolvidos: ${er.message}`);
  const idsResolvidos = new Set((resolvidos ?? []).map((x) => x.evento_id as string));
  const eventos = eventosDisparados(r.estado, eventosDef, idsResolvidos);

  const e = r.estado;
  const est = estagioAtual(e);
  const ganhos = houveGanho
    ? { ouro: r.ouroGanho, xp: r.xpGanho, levels: r.levelsGanhos, horas: Math.round(r.horasProdutivas * 10) / 10 }
    : null;
  return {
    nome: row.nome,
    estagio: { ordem: est.ordem, nome: est.nome, sub: est.sub },
    frase: fraseDoDia(e, row.nome, ganhos),
    eventos,
    level: e.level,
    xp: e.xp,
    xpProximo: xpParaProximoLevel(e.level),
    ouro: e.ouro,
    energia: Math.round(e.energia),
    energiaMax: energiaMaxima(e.atributos),
    momentum: e.momentum,
    atributos: e.atributos,
    ganhosOffline: ganhos,
    missoes: ((missoes ?? []) as MissaoRow[]).map((m) => ({
      ...m,
      concluida: m.tipo === "diaria" ? feitasHoje.has(m.id) : feitasSempre.has(m.id),
    })),
  };
}

export interface RespostaCheckin {
  xpGanho: number;
  energiaGanha: number;
  levelsGanhos: number;
  momentum: number;
  critico: boolean;
  level: number;
  xp: number;
  xpProximo: number;
  energia: number;
  ouro: number;
}

/** Check-in de missão: valida, aplica engine, persiste tudo. */
export async function fazerCheckin(
  db: SupabaseClient,
  userId: string,
  missaoId: string,
  prova: string | null,
  agora = new Date(),
): Promise<RespostaCheckin> {
  const row = await obterPersonagem(db, userId);
  if (!row) throw new Error("personagem não encontrado");

  const { data: m, error: em } = await db.from("missao").select("*").eq("id", missaoId).maybeSingle();
  if (em || !m) throw new Error("missão não encontrada");
  const missao = m as MissaoRow;

  const hoje = diaLocal(agora);
  const critico = !!prova && prova.trim().length >= 10;

  // Registro primeiro (a unique (user_id, missao_id, dia) barra duplicata de diária).
  if (missao.tipo === "unica") {
    const { count } = await db
      .from("checkin").select("id", { count: "exact", head: true })
      .eq("user_id", userId).eq("missao_id", missaoId);
    if ((count ?? 0) > 0) throw new Error("missão única já concluída");
  }
  const { error: ei } = await db.from("checkin").insert({
    user_id: userId, missao_id: missaoId, dia: hoje, critico, prova: prova?.trim() || null,
  });
  if (ei) throw new Error(ei.code === "23505" ? "missão já concluída hoje" : `checkin: ${ei.message}`);

  // Tick até agora e aplica a recompensa.
  const aposTick = tick(paraEstado(row), agora).estado;
  const r = aplicarCheckin(aposTick, missao, critico, agora);

  const { error: eu } = await db.from("personagem").update(paraUpdate(r.estado)).eq("user_id", userId);
  if (eu) throw new Error(`salvar checkin: ${eu.message}`);

  await db.from("evento_log").insert({
    user_id: userId, tipo: "checkin",
    payload: { missao: missao.titulo, xp: r.xpGanho, critico },
  });

  return {
    xpGanho: r.xpGanho,
    energiaGanha: r.energiaGanha,
    levelsGanhos: r.levelsGanhos,
    momentum: r.momentumNovo,
    critico,
    level: r.estado.level,
    xp: r.estado.xp,
    xpProximo: xpParaProximoLevel(r.estado.level),
    energia: Math.round(r.estado.energia),
    ouro: r.estado.ouro,
  };
}

export interface RespostaEvento {
  eventoId: string;
  opcaoId: string;
  level: number;
  xp: number;
  xpProximo: number;
  energia: number;
  ouro: number;
  momentum: number;
  atributos: { fortuna: number; mente: number; carreira: number; vigor: number };
}

/** Resolve um evento de escolha: valida a opção, aplica seus efeitos e persiste. */
export async function resolverEvento(
  db: SupabaseClient,
  userId: string,
  eventoId: string,
  opcaoId: string,
  agora = new Date(),
): Promise<RespostaEvento> {
  const row = await obterPersonagem(db, userId);
  if (!row) throw new Error("personagem não encontrado");

  const { data: ev, error: ee } = await db.from("evento_def").select("*").eq("id", eventoId).maybeSingle();
  if (ee || !ev) throw new Error("evento não encontrado");
  const evento = ev as EventoDef;
  const opcao = (evento.opcoes as OpcaoEvento[]).find((o) => o.id === opcaoId);
  if (!opcao) throw new Error("opção inválida");

  // Marca como resolvido primeiro (unique (user_id, evento_id) barra duplicata).
  const { error: er } = await db.from("evento_resolvido").insert({
    user_id: userId, evento_id: eventoId, opcao_id: opcaoId,
  });
  if (er) throw new Error(er.code === "23505" ? "evento já resolvido" : `evento: ${er.message}`);

  const aposTick = tick(paraEstado(row), agora).estado;
  const estado = aplicarEfeitos(aposTick, opcao.efeitos);

  const { error: eu } = await db.from("personagem").update(paraUpdate(estado)).eq("user_id", userId);
  if (eu) throw new Error(`salvar evento: ${eu.message}`);

  await db.from("evento_log").insert({
    user_id: userId, tipo: "evento",
    payload: { evento: evento.titulo, opcao: opcao.label },
  });

  return {
    eventoId,
    opcaoId,
    level: estado.level,
    xp: estado.xp,
    xpProximo: xpParaProximoLevel(estado.level),
    energia: Math.round(estado.energia),
    ouro: estado.ouro,
    momentum: estado.momentum,
    atributos: estado.atributos,
  };
}
