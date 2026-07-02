/**
 * Fatia a referência do Marcelo (public/ref/personagens.png, 6 colunas × 3 poses)
 * em 6 sprites de vista LATERAL (fileira do meio), com fundo transparente.
 *
 * Método: por célula → detecta a cor de fundo no canto → flood-fill a partir das
 * bordas marca o fundo CONECTADO (não come tons escuros internos das roupas) →
 * aparo pela bounding box do que sobrou → salva public/sprites/tier{i}.png.
 *
 * Uso: npx tsx scripts/fatiar-sprites.mts
 */

import { PNG } from "pngjs";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const ORIGEM = new URL("../public/ref/personagens.png", import.meta.url);
const DESTINO_DIR = new URL("../public/sprites/", import.meta.url);

const png = PNG.sync.read(readFileSync(ORIGEM));
const { width: W, height: H } = png;
console.log(`origem: ${W}×${H}`);

// Fileira do meio (vista lateral): faixa vertical calibrada pela proporção da folha.
const Y1 = Math.floor(H * 0.44);
const Y2 = Math.floor(H * 0.75);
const COLS = 6;
const TOL = 30; // distância de cor p/ "fundo" (baixa: a arte é escura; o filtro de componente limpa o resto)

function idx(x: number, y: number): number {
  return (W * y + x) << 2;
}

function dist(x: number, y: number, cor: readonly [number, number, number]): number {
  const i = idx(x, y);
  return (
    Math.abs(png.data[i]! - cor[0]) +
    Math.abs(png.data[i + 1]! - cor[1]) +
    Math.abs(png.data[i + 2]! - cor[2])
  );
}

mkdirSync(DESTINO_DIR, { recursive: true });

for (let col = 0; col < COLS; col++) {
  const X1 = Math.floor((col * W) / COLS) + 4;
  const X2 = Math.floor(((col + 1) * W) / COLS) - 4;
  const cw = X2 - X1;
  const ch = Y2 - Y1;

  // Cor de fundo: mediana simples de amostras dos 4 cantos da célula.
  const amostras: Array<[number, number, number]> = [];
  for (const [ax, ay] of [[X1 + 3, Y1 + 3], [X2 - 3, Y1 + 3], [X1 + 3, Y2 - 3], [X2 - 3, Y2 - 3]] as const) {
    const i = idx(ax, ay);
    amostras.push([png.data[i]!, png.data[i + 1]!, png.data[i + 2]!]);
  }
  const bg: [number, number, number] = [
    Math.round(amostras.reduce((s, a) => s + a[0], 0) / 4),
    Math.round(amostras.reduce((s, a) => s + a[1], 0) / 4),
    Math.round(amostras.reduce((s, a) => s + a[2], 0) / 4),
  ];

  // Flood-fill a partir das bordas: marca fundo conectado.
  const ehFundo = new Uint8Array(cw * ch);
  const fila: number[] = [];
  const empurrar = (cx: number, cy: number) => {
    const k = cy * cw + cx;
    if (ehFundo[k]) return;
    if (dist(X1 + cx, Y1 + cy, bg) <= TOL) {
      ehFundo[k] = 1;
      fila.push(k);
    }
  };
  for (let cx = 0; cx < cw; cx++) { empurrar(cx, 0); empurrar(cx, ch - 1); }
  for (let cy = 0; cy < ch; cy++) { empurrar(0, cy); empurrar(cw - 1, cy); }
  while (fila.length > 0) {
    const k = fila.pop()!;
    const cx = k % cw;
    const cy = Math.floor(k / cw);
    if (cx > 0) empurrar(cx - 1, cy);
    if (cx < cw - 1) empurrar(cx + 1, cy);
    if (cy > 0) empurrar(cx, cy - 1);
    if (cy < ch - 1) empurrar(cx, cy + 1);
  }

  // Morfologia sobre a máscara do personagem (1 = fundo):
  // FECHAMENTO (dilata→erode o personagem) solda pescoços/fios que o flood cortou;
  // ABERTURA (erode→dilata) remove franjas de serrilha de 1–2 px.
  const aplicar = (fonte: Uint8Array, raio: number, valor: 0 | 1): Uint8Array => {
    const saida = new Uint8Array(fonte);
    for (let cy = 0; cy < ch; cy++) {
      for (let cx = 0; cx < cw; cx++) {
        const k = cy * cw + cx;
        if (fonte[k] === valor) continue;
        let perto = false;
        for (let dy = -raio; dy <= raio && !perto; dy++) {
          for (let dx = -raio; dx <= raio && !perto; dx++) {
            const nx = cx + dx, ny = cy + dy;
            if (nx < 0 || nx >= cw || ny < 0 || ny >= ch) continue;
            if (fonte[ny * cw + nx] === valor) perto = true;
          }
        }
        if (perto) saida[k] = valor;
      }
    }
    return saida;
  };
  // personagem = 0 na máscara; "dilatar personagem" = espalhar 0; "erodir" = espalhar 1.
  let mascara = aplicar(ehFundo, 2, 0);   // fechamento: dilata personagem…
  mascara = aplicar(mascara, 2, 1);       // …e erode de volta
  mascara = aplicar(mascara, 1, 1);       // abertura: erode franjas…
  mascara = aplicar(mascara, 1, 0);       // …e dilata de volta
  ehFundo.set(mascara);

  // Componentes conexos do que NÃO é fundo; só o MAIOR sobrevive
  // (remove chuvisco de serrilha e ornamentos divisores da folha).
  const comp = new Int32Array(cw * ch).fill(-1);
  let nComp = 0;
  const tamanhos: number[] = [];
  for (let k0 = 0; k0 < cw * ch; k0++) {
    if (ehFundo[k0] || comp[k0] !== -1) continue;
    const id = nComp++;
    let tam = 0;
    const pilha = [k0];
    comp[k0] = id;
    while (pilha.length > 0) {
      const k = pilha.pop()!;
      tam++;
      const cx = k % cw;
      const cy = Math.floor(k / cw);
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || nx >= cw || ny < 0 || ny >= ch) continue;
        const nk = ny * cw + nx;
        if (!ehFundo[nk] && comp[nk] === -1) { comp[nk] = id; pilha.push(nk); }
      }
    }
    tamanhos.push(tam);
  }
  if (nComp === 0) { console.log(`tier${col}: VAZIO (nada além do fundo?)`); continue; }
  // Regra de sobrevivência: componente com tamanho relevante E centróide no miolo
  // horizontal da célula (mata chuvisco e o ornamento divisor da borda; preserva
  // cabeças/partes que o flood separou do corpo).
  const somaX = new Array<number>(nComp).fill(0);
  for (let k = 0; k < cw * ch; k++) {
    if (!ehFundo[k] && comp[k] >= 0) somaX[comp[k]!] = somaX[comp[k]!]! + (k % cw);
  }
  const sobrevive = tamanhos.map((tam, id) => {
    if (tam < 150) return false;
    const centroX = somaX[id]! / tam;
    return centroX > cw * 0.12 && centroX < cw * 0.88;
  });
  for (let k = 0; k < cw * ch; k++) {
    if (!ehFundo[k] && !sobrevive[comp[k]!]) ehFundo[k] = 1;
  }

  // Bounding box do personagem (o que NÃO é fundo).
  let minX = cw, maxX = -1, minY = ch, maxY = -1;
  for (let cy = 0; cy < ch; cy++) {
    for (let cx = 0; cx < cw; cx++) {
      if (!ehFundo[cy * cw + cx]) {
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;
      }
    }
  }
  if (maxX < 0) { console.log(`tier${col}: VAZIO (nada além do fundo?)`); continue; }

  const outW = maxX - minX + 1;
  const outH = maxY - minY + 1;
  const out = new PNG({ width: outW, height: outH });
  for (let cy = 0; cy < outH; cy++) {
    for (let cx = 0; cx < outW; cx++) {
      const srcK = (cy + minY) * cw + (cx + minX);
      const si = idx(X1 + minX + cx, Y1 + minY + cy);
      const di = (outW * cy + cx) << 2;
      out.data[di] = png.data[si]!;
      out.data[di + 1] = png.data[si + 1]!;
      out.data[di + 2] = png.data[si + 2]!;
      out.data[di + 3] = ehFundo[srcK] ? 0 : 255;
    }
  }
  const destino = new URL(`tier${col}.png`, DESTINO_DIR);
  writeFileSync(destino, PNG.sync.write(out));
  console.log(`tier${col}: ${outW}×${outH} → public/sprites/tier${col}.png`);
}
console.log("fatiamento concluído.");
