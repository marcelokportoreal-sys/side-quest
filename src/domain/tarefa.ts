/**
 * Tarefas criadas pelo usuário (a todo list de verdade).
 *
 * Regra de game design (anti-exploit de economia): o usuário NÃO define os
 * números de recompensa — escolhe um DOMÍNIO (qual stat de vida alimenta), um
 * TIPO (diária/única) e uma DIFICULDADE. A dificuldade mapeia para recompensas
 * fixas (xp/energia), mantendo a economia sob controle do design, não do jogador.
 */

import { type Dominio } from "./engine";

export type Dificuldade = "trivial" | "leve" | "media" | "desafiadora" | "epica";

export interface RecompensaTarefa {
  readonly xp: number;
  readonly energia: number;
}

/** Presets de recompensa por dificuldade (energia = combustível do idle). */
export const RECOMPENSAS: Readonly<Record<Dificuldade, RecompensaTarefa>> = {
  trivial: { xp: 10, energia: 6 },
  leve: { xp: 20, energia: 10 },
  media: { xp: 35, energia: 16 },
  desafiadora: { xp: 60, energia: 26 },
  epica: { xp: 100, energia: 40 },
};

export const DIFICULDADES: readonly Dificuldade[] = [
  "trivial", "leve", "media", "desafiadora", "epica",
];

export const DOMINIOS: readonly Dominio[] = ["fortuna", "mente", "carreira", "vigor"];

export function recompensaDe(d: Dificuldade): RecompensaTarefa {
  return RECOMPENSAS[d];
}

export interface NovaTarefa {
  readonly titulo: string;
  readonly descricao: string | null;
  readonly dominio: Dominio;
  readonly tipo: "unica" | "diaria";
  readonly dificuldade: Dificuldade;
}

export interface ErroValidacao {
  readonly ok: false;
  readonly erro: string;
}
export interface OkValidacao {
  readonly ok: true;
  readonly valor: NovaTarefa;
}

/** Valida/normaliza a entrada do formulário de nova tarefa (puro, testável). */
export function validarNovaTarefa(input: {
  titulo?: unknown;
  descricao?: unknown;
  dominio?: unknown;
  tipo?: unknown;
  dificuldade?: unknown;
}): ErroValidacao | OkValidacao {
  const titulo = typeof input.titulo === "string" ? input.titulo.trim() : "";
  if (titulo.length < 2 || titulo.length > 80) {
    return { ok: false, erro: "título deve ter 2–80 caracteres" };
  }
  const dominio = input.dominio;
  if (typeof dominio !== "string" || !DOMINIOS.includes(dominio as Dominio)) {
    return { ok: false, erro: "domínio inválido" };
  }
  const tipo = input.tipo === "unica" || input.tipo === "diaria" ? input.tipo : null;
  if (!tipo) return { ok: false, erro: "tipo inválido (unica|diaria)" };
  const dificuldade = input.dificuldade;
  if (typeof dificuldade !== "string" || !DIFICULDADES.includes(dificuldade as Dificuldade)) {
    return { ok: false, erro: "dificuldade inválida" };
  }
  const descricaoRaw = typeof input.descricao === "string" ? input.descricao.trim() : "";
  return {
    ok: true,
    valor: {
      titulo,
      descricao: descricaoRaw.length ? descricaoRaw.slice(0, 280) : null,
      dominio: dominio as Dominio,
      tipo,
      dificuldade: dificuldade as Dificuldade,
    },
  };
}
