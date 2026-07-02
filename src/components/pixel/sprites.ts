/**
 * Sprites em pixel art definidos como matrizes de caracteres (1 char = 1 pixel).
 * Paleta limitada, clima gótico (referência visual: Blasphemous — só a estética).
 * '.' = transparente. As cores de 'c'/'C'/'g' mudam com o tier (pobre → nobre).
 */

export interface Paleta {
  readonly [ch: string]: string;
}

/** Tiers de "subida na vida": roupas do herói por level. */
export function tierDoLevel(level: number): number {
  if (level >= 15) return 3; // casaco nobre
  if (level >= 9) return 2;  // couro com detalhe dourado
  if (level >= 5) return 1;  // túnica simples
  return 0;                  // trapos
}

const PELE = "#c9a684";
const OUTLINE = "#14100f";

/** Paleta por tier: c=capa, C=sombra da capa, g=detalhe, b=botas, p=pernas. */
export function paletaHeroi(tier: number): Paleta {
  const roupas: ReadonlyArray<{ c: string; C: string; g: string; b: string; p: string }> = [
    { c: "#6b5a45", C: "#4a3e30", g: "#6b5a45", b: "#3a3028", p: "#4a3e30" }, // trapos
    { c: "#4a5a74", C: "#35415a", g: "#7a8aa4", b: "#463a2e", p: "#3a4356" }, // túnica
    { c: "#5a4a3a", C: "#42362a", g: "#c9a24f", b: "#2e2620", p: "#42362a" }, // couro+ouro
    { c: "#4a3a5e", C: "#362a46", g: "#d4b45f", b: "#241e2c", p: "#362a46" }, // nobre
  ];
  const r = roupas[Math.min(tier, roupas.length - 1)]!;
  return {
    k: OUTLINE, s: PELE, e: "#0d0a0a",
    c: r.c, C: r.C, g: r.g, b: r.b, p: r.p,
    h: "#2a2224",
  };
}

/*
 * Herói encapuzado 16×22. Corpo (cabeça+capa até o quadril) fixo;
 * pernas variam por frame de caminhada. Capa balança pelo offset do frame.
 */
export const HEROI_CORPO: readonly string[] = [
  "......kkkk......",
  ".....khhhhk.....",
  "....khhhhhhk....",
  "....khsssshk....",
  "....khsesesk....",
  "....khsssshk....",
  ".....ksssk......",
  "....kccCcck.....",
  "...kccccCcck....",
  "..kcCccccCcck...",
  "..kcCccccCcck...",
  ".kccCccccCccck..",
  ".kcCcccccCccck..",
  ".kcCcccccCccck..",
  ".kccCcgccCccck..",
  "..kcCcgccCcck...",
];

/** Pernas 16×6 — 4 frames do ciclo de caminhada. */
export const HEROI_PERNAS_ANDAR: ReadonlyArray<readonly string[]> = [
  [ // contato — pernas abertas
    "..kpp....ppk....",
    "..kpp.....ppk...",
    ".kbb.......bbk..",
    ".kbbk......kbbk.",
    "..kk........kk..",
    "................",
  ],
  [ // apoio — juntando
    "...kpp..ppk.....",
    "...kpp..ppk.....",
    "...kbb...bbk....",
    "...kbbk..kbbk...",
    "....kk....kk....",
    "................",
  ],
  [ // passagem — cruzadas
    "....kpppppk.....",
    "....kpp.ppk.....",
    "....kbb.bbk.....",
    "....kbbkbbk.....",
    ".....kk.kk......",
    "................",
  ],
  [ // impulso — abrindo de novo
    "...kpp...ppk....",
    "..kpp.....ppk...",
    "..kbb......bbk..",
    "..kbbk.....kbbk.",
    "...kk.......kk..",
    "................",
  ],
];

/** Herói sentado (descansando na fogueira) 16×16. */
export const HEROI_SENTADO: readonly string[] = [
  "................",
  "......kkkk......",
  ".....khhhhk.....",
  "....khhhhhhk....",
  "....khsssshk....",
  "....khsesesk....",
  "....khsssshk....",
  ".....ksssk......",
  "....kccCcck.....",
  "...kccccCcck....",
  "..kcCccccCcck...",
  ".kccCccccCccck..",
  ".kcCcccccCcccck.",
  ".kccpppppppcck..",
  "..kbbk...kbbk...",
  "...kk.....kk....",
];

/** Fogueira 10×10 — 3 frames. */
export const FOGUEIRA: ReadonlyArray<readonly string[]> = [
  [
    "..........",
    "....ff....",
    "...fFf....",
    "...fFFf...",
    "..fFYFf...",
    "..fFYYf...",
    "...fYf....",
    ".wwkkkww..",
    "..wkkkw...",
    "..........",
  ],
  [
    "..........",
    "..........",
    "....ff....",
    "...fFYf...",
    "..fFYYFf..",
    "..fFYFf...",
    "...fYFf...",
    ".wwkkkww..",
    "..wkkkw...",
    "..........",
  ],
  [
    "..........",
    "....f.....",
    "...fFf....",
    "..fFYFf...",
    "..fYYFf...",
    "...fYYf...",
    "...fFf....",
    ".wwkkkww..",
    "..wkkkw...",
    "..........",
  ],
];

export const PALETA_FOGUEIRA: Paleta = {
  f: "#b3542e", F: "#d97b32", Y: "#e8b34a", w: "#4a3a2c", k: "#241c16",
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

/** Desenha um sprite (matriz de chars) no contexto, pixel a pixel. */
export function desenharSprite(
  ctx: CanvasRenderingContext2D,
  sprite: readonly string[],
  paleta: Paleta,
  x: number,
  y: number,
  flip = false,
): void {
  for (let r = 0; r < sprite.length; r++) {
    const linha = sprite[r]!;
    for (let c = 0; c < linha.length; c++) {
      const ch = linha[c]!;
      if (ch === ".") continue;
      const cor = paleta[ch];
      if (!cor) continue;
      ctx.fillStyle = cor;
      const px = flip ? x + (linha.length - 1 - c) : x + c;
      ctx.fillRect(px, y + r, 1, 1);
    }
  }
}
