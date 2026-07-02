/**
 * Upgrades permanentes — o SINK de ouro e o laço viciante do idle.
 *
 * Sem um destino para o ouro, a produção idle vira número morto. Aqui o ouro é
 * gasto em upgrades de custo crescente que aceleram a própria produção — o loop
 * clássico "produz → compra → produz mais rápido" (inspirado no Rune Tree do TBH).
 *
 * Estado guardado em personagem.sistemas.upgrades (jsonb), reaproveitando a
 * semente data-driven (A4) — sem tabela nova. Puro e determinístico.
 */

export type UpgradeId = "picareta" | "mente" | "cantil" | "folego";

export interface UpgradeDef {
  readonly id: UpgradeId;
  readonly nome: string;
  readonly descricao: string;
  readonly icone: string;
  readonly custoBase: number;
  readonly custoMult: number; // custo do nível n = custoBase * custoMult^n
  readonly nivelMax: number;
}

export const UPGRADES: readonly UpgradeDef[] = [
  { id: "picareta", nome: "Picareta Melhor", descricao: "+25% de ouro por nível", icone: "⛏️", custoBase: 120, custoMult: 1.8, nivelMax: 20 },
  { id: "mente",    nome: "Mente Afiada",    descricao: "+25% de XP por nível",   icone: "🧠", custoBase: 120, custoMult: 1.8, nivelMax: 20 },
  { id: "cantil",   nome: "Cantil Maior",    descricao: "+20 de energia máxima por nível", icone: "🫙", custoBase: 150, custoMult: 1.7, nivelMax: 15 },
  { id: "folego",   nome: "Fôlego",          descricao: "+5% de eficiência de energia por nível", icone: "🌬️", custoBase: 200, custoMult: 2.0, nivelMax: 8 },
];

export type NiveisUpgrade = Readonly<Record<string, number>>;

/** Lê o mapa de níveis de upgrade de dentro de sistemas (jsonb). */
export function niveisDe(sistemas: Readonly<Record<string, unknown>>): NiveisUpgrade {
  const u = sistemas.upgrades;
  return u && typeof u === "object" ? (u as NiveisUpgrade) : {};
}

export function nivelUpgrade(sistemas: Readonly<Record<string, unknown>>, id: UpgradeId): number {
  const n = niveisDe(sistemas)[id];
  return typeof n === "number" && n > 0 ? Math.floor(n) : 0;
}

/** Custo do PRÓXIMO nível (nível atual → atual+1). Infinity se no máximo. */
export function custoProximoNivel(def: UpgradeDef, nivelAtual: number): number {
  if (nivelAtual >= def.nivelMax) return Infinity;
  return Math.round(def.custoBase * Math.pow(def.custoMult, nivelAtual));
}

export interface BonusUpgrades {
  readonly ouroMult: number;      // multiplicador de produção de ouro
  readonly xpMult: number;        // multiplicador de produção de xp
  readonly energiaMaxBonus: number; // + energia máxima
  readonly eficienciaEnergia: number; // 0..~0.4: reduz consumo de energia/hora
}

/** Bônus agregado dos upgrades — puro, derivado só do estado. */
export function bonusDeUpgrades(sistemas: Readonly<Record<string, unknown>>): BonusUpgrades {
  const picareta = nivelUpgrade(sistemas, "picareta");
  const mente = nivelUpgrade(sistemas, "mente");
  const cantil = nivelUpgrade(sistemas, "cantil");
  const folego = nivelUpgrade(sistemas, "folego");
  return {
    ouroMult: 1 + 0.25 * picareta,
    xpMult: 1 + 0.25 * mente,
    energiaMaxBonus: 20 * cantil,
    eficienciaEnergia: Math.min(0.4, 0.05 * folego),
  };
}
