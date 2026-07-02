/**
 * Engine idle do Side Quest — PURO e determinístico (mesma entrada → mesma saída).
 *
 * Regras de design (inegociáveis, vindas do perfil do jogador):
 *  - A ÚNICA fonte de Energia são check-ins de ações reais. Sem energia o herói
 *    DESCANSA — nunca há punição por dia vazio.
 *  - Momentum sobe com dias consecutivos de check-in e DECAI 1 passo por dia
 *    vazio (nunca zera de uma vez — streak que quebra é gatilho de abandono).
 *  - Produção offline: calculada por delta de tempo na leitura; sem cron.
 */

export const ENERGIA_POR_HORA = 10; // 1 ponto de energia ≈ 6min de grind
export const OURO_BASE_HORA = 60;
export const XP_BASE_HORA = 30;
export const MOMENTUM_MAX = 10; // multiplicador x1.0 → x2.0

export interface Atributos {
  readonly fortuna: number; // renda extra   → +ouro/h (2%/ponto)
  readonly mente: number;   // aprendizado   → +xp/h (2%/ponto)
  readonly carreira: number;// candidaturas  → (F2: desconto na loja)
  readonly vigor: number;   // hábitos       → +5 de energia máxima/ponto
}

export interface EstadoPersonagem {
  readonly level: number;
  readonly xp: number;       // xp dentro do level atual
  readonly ouro: number;
  readonly energia: number;  // estoque atual
  readonly momentum: number; // 0..MOMENTUM_MAX
  readonly atributos: Atributos;
  readonly lastTick: Date;
  /** Dia local (YYYY-MM-DD) do último check-in; null = nunca. */
  readonly ultimoCheckinDia: string | null;
}

export interface ResultadoTick {
  readonly estado: EstadoPersonagem;
  readonly ouroGanho: number;
  readonly xpGanho: number;
  readonly levelsGanhos: number;
  readonly horasProdutivas: number;
}

/** XP necessário para SAIR do level n (curva suave: 100·n^1.5). */
export function xpParaProximoLevel(level: number): number {
  return Math.round(100 * Math.pow(level, 1.5));
}

export function energiaMaxima(atributos: Atributos): number {
  return 100 + atributos.vigor * 5;
}

export function multiplicadorMomentum(momentum: number): number {
  return 1 + 0.1 * Math.min(Math.max(momentum, 0), MOMENTUM_MAX);
}

/** Dia local de Rondônia (UTC-4, sem DST) para fronteiras de "dia". */
export function diaLocal(instante: Date): string {
  const shifted = new Date(instante.getTime() - 4 * 3600_000);
  return shifted.toISOString().slice(0, 10);
}

function diasEntre(diaA: string, diaB: string): number {
  const a = Date.parse(`${diaA}T00:00:00Z`);
  const b = Date.parse(`${diaB}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

/** Decaimento do momentum: -1 por dia INTEIRO vazio desde o último check-in. */
export function decairMomentum(momentum: number, ultimoCheckinDia: string | null, hoje: string): number {
  if (!ultimoCheckinDia) return 0;
  const gap = diasEntre(ultimoCheckinDia, hoje) - 1; // ontem→hoje = sem gap
  if (gap <= 0) return momentum;
  return Math.max(0, momentum - gap);
}

function aplicarXp(level: number, xp: number, ganho: number): { level: number; xp: number; levels: number } {
  let l = level;
  let x = xp + ganho;
  let ups = 0;
  while (x >= xpParaProximoLevel(l)) {
    x -= xpParaProximoLevel(l);
    l += 1;
    ups += 1;
  }
  return { level: l, xp: x, levels: ups };
}

/**
 * Avança o relógio do jogo: consome energia para produzir ouro/XP no intervalo
 * [lastTick, agora]. Horas produtivas = min(Δh, energia/ENERGIA_POR_HORA).
 */
export function tick(estado: EstadoPersonagem, agora: Date): ResultadoTick {
  const deltaMs = agora.getTime() - estado.lastTick.getTime();
  if (deltaMs <= 0) return { estado, ouroGanho: 0, xpGanho: 0, levelsGanhos: 0, horasProdutivas: 0 };

  const momentumAtual = decairMomentum(estado.momentum, estado.ultimoCheckinDia, diaLocal(agora));
  const deltaHoras = deltaMs / 3_600_000;
  const horasComEnergia = estado.energia / ENERGIA_POR_HORA;
  const horasProdutivas = Math.min(deltaHoras, horasComEnergia);

  const mult = multiplicadorMomentum(momentumAtual);
  const ouroGanho = Math.floor(horasProdutivas * OURO_BASE_HORA * (1 + estado.atributos.fortuna * 0.02) * mult);
  const xpGanho = Math.floor(horasProdutivas * XP_BASE_HORA * (1 + estado.atributos.mente * 0.02) * mult);
  const energiaRestante = Math.max(0, estado.energia - horasProdutivas * ENERGIA_POR_HORA);

  const { level, xp, levels } = aplicarXp(estado.level, estado.xp, xpGanho);

  return {
    estado: {
      ...estado,
      level,
      xp,
      ouro: estado.ouro + ouroGanho,
      energia: energiaRestante,
      momentum: momentumAtual,
      lastTick: agora,
    },
    ouroGanho,
    xpGanho,
    levelsGanhos: levels,
    horasProdutivas,
  };
}

export type Dominio = "fortuna" | "mente" | "carreira" | "vigor";

export interface MissaoDef {
  readonly dominio: Dominio;
  readonly xp: number;
  readonly energia: number;
}

export interface ResultadoCheckin {
  readonly estado: EstadoPersonagem;
  readonly xpGanho: number;
  readonly energiaGanha: number;
  readonly levelsGanhos: number;
  readonly momentumNovo: number;
  readonly critico: boolean;
}

/**
 * Check-in de uma ação real: XP imediato (crítico = +50%), energia (limitada ao
 * máximo), +1 no atributo do domínio e momentum (+1 se 1º check-in do dia).
 */
export function aplicarCheckin(
  estado: EstadoPersonagem,
  missao: MissaoDef,
  critico: boolean,
  agora: Date,
): ResultadoCheckin {
  const hoje = diaLocal(agora);
  const base = decairMomentum(estado.momentum, estado.ultimoCheckinDia, hoje);
  const primeiroDoDia = estado.ultimoCheckinDia !== hoje;
  const momentumNovo = primeiroDoDia ? Math.min(MOMENTUM_MAX, base + 1) : base;

  const xpGanho = Math.round(missao.xp * (critico ? 1.5 : 1));
  const atributos: Atributos = { ...estado.atributos, [missao.dominio]: estado.atributos[missao.dominio] + 1 };
  const energiaGanha = Math.min(missao.energia, energiaMaxima(atributos) - estado.energia);
  const { level, xp, levels } = aplicarXp(estado.level, estado.xp, xpGanho);

  return {
    estado: {
      ...estado,
      level,
      xp,
      energia: estado.energia + Math.max(0, energiaGanha),
      momentum: momentumNovo,
      atributos,
      ultimoCheckinDia: hoje,
    },
    xpGanho,
    energiaGanha: Math.max(0, energiaGanha),
    levelsGanhos: levels,
    momentumNovo,
    critico,
  };
}
