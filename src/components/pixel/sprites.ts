/**
 * Sprites v2 — pixel art em matrizes de chars (1 char = 1 pixel), guiados pela
 * referência do Marcelo: 6 tiers da subida na vida, do Maltrapilho ao Dono do
 * Mundo. Clima Blasphemous (paleta sombria, dourados sujos).
 *
 * Composição do herói (20×30): CAPA (fundo, tiers altos) → PERNAS (frame de
 * caminhada) → TORSO (por tier) → CABEÇA (comum) → EXTRAS (gola de pele, coroa).
 * '.' = transparente.
 */

export interface Paleta {
  readonly [ch: string]: string;
}

export interface TierInfo {
  readonly nome: string;
  readonly sub: string;
  readonly levelMin: number;
}

/** Os 6 estágios da referência. */
export const TIERS: readonly TierInfo[] = [
  { nome: "Maltrapilho", sub: "o nada", levelMin: 1 },
  { nome: "Sobrevivente", sub: "primeiros passos", levelMin: 4 },
  { nome: "Rapaz Comum", sub: "uma vida decente", levelMin: 8 },
  { nome: "Bem Sucedido", sub: "prosperidade", levelMin: 12 },
  { nome: "Podre de Rico", sub: "excesso e poder", levelMin: 17 },
  { nome: "Dono do Mundo", sub: "o topo", levelMin: 23 },
];

export function tierDoLevel(level: number): number {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (level >= TIERS[i]!.levelMin) return i;
  }
  return 0;
}

const OUT = "#100c0e";
const PELE = "#c2996f";
const PELE_S = "#9a774f";
const CABELO = "#241a16";
const BARBA = "#33261e";

/**
 * Paletas por tier — chars:
 * k outline · s pele · S pele sombra · h cabelo · d barba · e olho
 * t túnica/camisa · T sombra túnica · v veste/colete · V sombra veste
 * p calça · b bota · g detalhe dourado · f pele(animal)/gola · m manto/capa · M sombra manto
 */
export function paletaHeroi(tier: number): Paleta {
  const base = { k: OUT, s: PELE, S: PELE_S, h: CABELO, d: BARBA, e: "#0b0808" };
  const porTier: ReadonlyArray<Record<string, string>> = [
    { t: "#5a4632", T: "#42331f", v: "#4a3a28", V: "#382a1c", p: "#4a3a28", b: PELE_S, g: "#5a4632", f: "#5a4632", m: "#42331f", M: "#382a1c" },
    { t: "#4e4034", T: "#3a2f24", v: "#3f3a44", V: "#2e2a33", p: "#3a3230", b: "#2e241c", g: "#6a5a42", f: "#57493a", m: "#463c34", M: "#332b24" },
    { t: "#c8bfa8", T: "#a99f86", v: "#5d4632", V: "#46341f", p: "#33333f", b: "#38271a", g: "#8a6a3a", f: "#5d4632", m: "#5d4632", M: "#46341f" },
    { t: "#d9d2be", T: "#b3ab94", v: "#2c2c3f", V: "#1e1e2e", p: "#26262f", b: "#191216", g: "#c9a24f", f: "#2c2c3f", m: "#33334c", M: "#232338" },
    { t: "#d9d2be", T: "#b3ab94", v: "#5a2c4a", V: "#421d36", p: "#2a1e28", b: "#1a1216", g: "#d4ac54", f: "#e0d8ca", m: "#4e2440", M: "#38182e" },
    { t: "#e6ddca", T: "#c2b89e", v: "#3a2a52", V: "#291c3c", p: "#241a2e", b: "#161016", g: "#e8c460", f: "#efe8d8", m: "#2e2244", M: "#1f1730" },
  ];
  return { ...base, ...porTier[Math.min(tier, porTier.length - 1)]! } as Paleta;
}

/** Cabeça comum 20×9 (a barba 'd' some visualmente nos tiers altos via paleta? não — mantida: personagem é o mesmo rapaz). */
export const CABECA: readonly string[] = [
  "........kkkk........",
  ".......khhhhk.......",
  "......khhhhhhk......",
  "......khssssShk.....",
  "......ksesseSk......",
  "......ksssssSk......",
  "......kdssssdk......",
  ".......kdddSk.......",
  "........ksSk........",
];

/** Torsos por tier 20×12 (linhas 9–20). Silhuetas seguem a referência. */
export const TORSOS: ReadonlyArray<readonly string[]> = [
  [ // 0 Maltrapilho — trapos rasgados, braços à mostra
    "......ktvtvk........",
    ".....ktvtvtvk.......",
    "....ksktvtvks.......",
    "....ksktvVtks.......",
    "....kskvtvtks.......",
    "....ks.ktvk.sk......",
    "........kvtk........",
    "....kS..ktvVk.......",
    "....kk..kvtv.k......",
    "........ktVtk.......",
    ".........kvk........",
    "........k.k.........",
  ],
  [ // 1 Sobrevivente — capuz caído + cachecol + faixas
    ".....kffffffk.......",
    "....kfvvvvvvfk......",
    "....kvtvvvvtvk......",
    "...kskvvVvvkssk.....",
    "...ktkvvvVvktk......",
    "...ksskvVvvkss......",
    "....kk.kvvk.kk......",
    ".......kvVvk........",
    ".......kvvvk........",
    ".......kvVvk........",
    "........kvk.........",
    "....................",
  ],
  [ // 2 Rapaz Comum — camisa clara + colete
    ".....kttttttk.......",
    "....ktvvvvvvtk......",
    "....ktvVvvVvtk......",
    "...ktkvvvvvvktk.....",
    "...ktkvVvvVvktk.....",
    "...ksskvvvvkssk.....",
    "....kk.kvVk.kk......",
    ".......kvvvk........",
    ".......kvVvk........",
    ".......kvvvk........",
    "........kvk.........",
    "....................",
  ],
  [ // 3 Bem Sucedido — sobretudo escuro, gravata clara, botões dourados
    ".....ktTttTtk.......",
    "....kvvtttTvvk......",
    "....kvVgttgVvk......",
    "...kvkvvttvvkvk.....",
    "...kvkvgttgvkvk.....",
    "...ksskvvvvkssk.....",
    "....kk.kvgk.kk......",
    ".......kvvvk........",
    ".......kvgvk........",
    ".......kvvvk........",
    "........kvk.........",
    "....................",
  ],
  [ // 4 Podre de Rico — manto púrpura com gola de pele
    "....kffffffffk......",
    "...kfmvvvvvvmfk.....",
    "...kfvVgvvgVvfk.....",
    "..kmkvvvvvvvvkmk....",
    "..kmkvgvVvgvvkmk....",
    "..ksskvvvvvvkssk....",
    "...kk.kvgvgk.kk.....",
    "......kvvvvk........",
    "......kvgvVk........",
    "......kvvvvk........",
    ".......kvvk.........",
    "........kk..........",
  ],
  [ // 5 Dono do Mundo — manto real, ombreiras douradas
    "...kgffffffffgk.....",
    "..kgfmvvvvvvmfgk....",
    "..kfvVgvggvgVvfk....",
    ".kmkvvvvvvvvvvkmk...",
    ".kmkvgvVvvVvgvkmk...",
    ".kmskvvvvvvvvksmk...",
    "..kk.kvgvvgvk.kk....",
    "......kvvvvk........",
    "......kgvVgk........",
    "......kvvvvk........",
    ".......kvvk.........",
    "........kk..........",
  ],
];

/** Pernas 20×9 — 6 frames do ciclo (linhas 21–29). b = bota (tier0: pele = descalço). */
export const PERNAS_ANDAR: ReadonlyArray<readonly string[]> = [
  [ // 1 contato amplo
    ".....kpp...ppk......",
    "....kpp.....ppk.....",
    "....kpp......ppk....",
    "...kbb........bbk...",
    "...kbb........kbbk..",
    "..kbbk.........kbk..",
    "..kbk...............",
    "....................",
    "....................",
  ],
  [ // 2 fechando
    ".....kpp..ppk.......",
    ".....kpp..ppk.......",
    "....kpp....ppk......",
    "....kbb.....bbk.....",
    "...kbb......kbbk....",
    "...kbk.......kbk....",
    "....................",
    "....................",
    "....................",
  ],
  [ // 3 passagem
    "......kppppk........",
    "......kpp.pk........",
    "......kpp.ppk.......",
    "......kbb..bbk......",
    ".....kbb...kbk......",
    ".....kbk............",
    "....................",
    "....................",
    "....................",
  ],
  [ // 4 cruzando
    "......kpppk.........",
    ".....kpp.ppk........",
    ".....kpp..ppk.......",
    "....kbb....bbk......",
    "....kbb....kbk......",
    "...kbbk.............",
    "...kbk..............",
    "....................",
    "....................",
  ],
  [ // 5 abrindo
    ".....kpp..ppk.......",
    "....kpp....ppk......",
    "....kpp....ppk......",
    "...kbb......bbk.....",
    "...kbb......kbbk....",
    "..kbbk.......kbk....",
    "..kbk...............",
    "....................",
    "....................",
  ],
  [ // 6 quase contato
    "....kpp....ppk......",
    "....kpp.....ppk.....",
    "...kpp.......ppk....",
    "...kbb........bbk...",
    "..kbb.........kbbk..",
    "..kbk..........kbk..",
    "....................",
    "....................",
    "....................",
  ],
];

/** Capa longa às costas (tiers 4–5), desenhada ANTES do corpo. 20×20 (linhas 9–28). */
export const CAPA_LONGA: readonly string[] = [
  "..kmmk..............",
  ".kmmmmk.............",
  ".kmMmmmk............",
  ".kmmmMmk............",
  ".kmMmmmmk...........",
  ".kmmmMmmk...........",
  ".kmMmmmmk...........",
  ".kmmmMmmmk..........",
  ".kmMmmmmmk..........",
  ".kmmmMmmmk..........",
  ".kmMmmmmmk..........",
  ".kmmmmMmmk..........",
  ".kmMmmmmmk..........",
  ".kmmmMmmk...........",
  ".kmMmmmmk...........",
  ".kmmmmmk............",
  ".kmMmmk.............",
  "..kmmk..............",
  "...kk...............",
  "....................",
];

/** Coroa (tier 5) 20×4, sobre a cabeça (linhas -3..0). */
export const COROA: readonly string[] = [
  ".......g.g.g........",
  ".......ggggg........",
  ".......ggggg........",
  "....................",
];

/** Herói sentado 20×20 (descanso na fogueira). */
export const SENTADO: readonly string[] = [
  "........kkkk........",
  ".......khhhhk.......",
  "......khhhhhhk......",
  "......khssssShk.....",
  "......ksesseSk......",
  "......kssssssk......",
  "......kdssssdk......",
  ".......kdddSk.......",
  "......kvvvvvvk......",
  ".....kvvVvvVvvk.....",
  "....kvkvvvvvvkvk....",
  "....kvkvVvvVvkvk....",
  "...kvvkvvvvvvkvvk...",
  "...kvVvvvvvvvvVvk...",
  "...kvvpppppppppvk...",
  "....kppkkkkkkppk....",
  "....kbbk....kbbk....",
  "....kbbk....kbbk....",
  ".....kk......kk.....",
  "....................",
];

/** Fogueira 12×12 — 3 frames. */
export const FOGUEIRA: ReadonlyArray<readonly string[]> = [
  [
    "............",
    ".....ff.....",
    "....fFf.....",
    "....fFFf....",
    "...fFYFf....",
    "...fFYYff...",
    "....fYYf....",
    "....fYf.....",
    ".wwkkkkkww..",
    "..wwkkkww...",
    "............",
    "............",
  ],
  [
    "............",
    "............",
    "....ff......",
    "...fFYf.....",
    "...fFYYFf...",
    "..fFYYFf....",
    "...fFYf.....",
    "....fYf.....",
    ".wwkkkkkww..",
    "..wwkkkww...",
    "............",
    "............",
  ],
  [
    "............",
    ".....f......",
    "....fFf.....",
    "...fFYFf....",
    "...fYYFff...",
    "....fYYFf...",
    "....fYYf....",
    "....fFf.....",
    ".wwkkkkkww..",
    "..wwkkkww...",
    "............",
    "............",
  ],
];

export const PALETA_FOGUEIRA: Paleta = {
  f: "#a84e2c", F: "#d4762f", Y: "#e8b34a", w: "#443627", k: "#201812",
};

/** Moeda 6×6 — 4 frames de giro. */
export const MOEDA: ReadonlyArray<readonly string[]> = [
  ["..gg..", ".gGGg.", "gGyyGg", "gGyyGg", ".gGGg.", "..gg.."],
  ["..gg..", "..GGg.", ".gGyG.", ".GyGg.", ".gGG..", "..gg.."],
  ["..g...", "..Gg..", "..gG..", "..Gg..", "..gG..", "..g..."],
  [".gg...", ".gGG..", ".GyGg.", ".gGyG.", "..GGg.", "...gg."],
];

export const PALETA_MOEDA: Paleta = {
  g: "#8a6a2f", G: "#c9a24f", y: "#e8cc7a",
};

/** Desenha um sprite (matriz de chars); `escala` = tamanho do pixel lógico. */
export function desenharSprite(
  ctx: CanvasRenderingContext2D,
  sprite: readonly string[],
  paleta: Paleta,
  x: number,
  y: number,
  escala = 1,
): void {
  for (let r = 0; r < sprite.length; r++) {
    const linha = sprite[r]!;
    for (let c = 0; c < linha.length; c++) {
      const ch = linha[c]!;
      if (ch === ".") continue;
      const cor = paleta[ch];
      if (!cor) continue;
      ctx.fillStyle = cor;
      ctx.fillRect(x + c * escala, y + r * escala, escala, escala);
    }
  }
}

/** Desenha o herói completo caminhando (composição por camadas). */
export function desenharHeroiAndando(
  ctx: CanvasRenderingContext2D,
  tier: number,
  frame: number,
  x: number,
  y: number,
  escala = 1,
): void {
  const p = paletaHeroi(tier);
  const bob = (frame % 3 === 1 ? 1 : 0) * escala;
  if (tier >= 4) desenharSprite(ctx, CAPA_LONGA, p, x - 4 * escala, y + 9 * escala + bob, escala);
  desenharSprite(ctx, PERNAS_ANDAR[frame % PERNAS_ANDAR.length]!, p, x, y + 21 * escala, escala);
  desenharSprite(ctx, TORSOS[Math.min(tier, TORSOS.length - 1)]!, p, x, y + 9 * escala + bob, escala);
  desenharSprite(ctx, CABECA, p, x, y + bob, escala);
  if (tier === 5) desenharSprite(ctx, COROA, p, x, y - 3 * escala + bob, escala);
}

/** Desenha o herói sentado (descanso). */
export function desenharHeroiSentado(
  ctx: CanvasRenderingContext2D,
  tier: number,
  x: number,
  y: number,
  escala = 1,
): void {
  const p = paletaHeroi(tier);
  desenharSprite(ctx, SENTADO, p, x, y, escala);
  if (tier === 5) desenharSprite(ctx, COROA, p, x, y - 3 * escala, escala);
}
