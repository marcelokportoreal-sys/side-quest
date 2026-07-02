"use client";

/**
 * Cena viva v2 — pixel art 2D com parallax, redesenhada para os 6 estágios da
 * referência (Maltrapilho → Dono do Mundo). O herói caminha enquanto há energia
 * (idle avançando); sem energia, descansa numa fogueira. Cenário, arquitetura e
 * luz evoluem com o tier: ruínas → vila → cidade → distrito nobre → palácio.
 * Render: buffer 320×160 escalado (pixels nítidos); rAF + Δt.
 */

import { useEffect, useRef } from "react";
import {
  desenharSprite, desenharHeroiAndando, desenharHeroiSentado,
  tierDoLevel, TIERS,
  FOGUEIRA, PALETA_FOGUEIRA, MOEDA, PALETA_MOEDA,
} from "./sprites";

const W = 320;
const H = 160;
const CHAO = 134;
const HEROI_X = 116;
const ENERGIA_POR_SEGUNDO = 10 / 3600; // espelha ENERGIA_POR_HORA do engine

interface Props {
  readonly level: number;
  readonly energia: number;
  readonly momentum: number;
  /** Incrementa a cada check-in — dispara salto + chuva de moedas. */
  readonly pulso: number;
  readonly nome: string;
}

interface Moeda { wx: number; y: number; frame: number }
interface Particula { x: number; y: number; vx: number; vy: number; vida: number; cor: string }

function hash(n: number): number {
  let h = (n | 0) * 2654435761;
  h = (h ^ (h >>> 16)) >>> 0;
  return h / 4294967296;
}

interface Estagio {
  ceuAlto: string; ceuBaixo: string;
  longe: string;
  predio: string; predioEscuro: string; luz: string;
  altMin: number; altMax: number; densJanelas: number;
  janelaArco: boolean; torres: boolean; bandeiras: boolean; calcamento: boolean;
  chao: string; chaoDetalhe: string;
  lua: string;
}

/** 6 estágios casando com os tiers da referência. */
const ESTAGIOS: readonly Estagio[] = [
  { // 0 O Nada — ruínas e barracos, céu quase preto
    ceuAlto: "#0d0b12", ceuBaixo: "#1e1824", longe: "#1d1722",
    predio: "#2a222e", predioEscuro: "#171118", luz: "#8a6430",
    altMin: 12, altMax: 26, densJanelas: 0.08,
    janelaArco: false, torres: false, bandeiras: false, calcamento: false,
    chao: "#1b151f", chaoDetalhe: "#2c2331", lua: "#8a8578",
  },
  { // 1 Primeiros Passos — vila
    ceuAlto: "#0f0e18", ceuBaixo: "#241e2e", longe: "#221c2e",
    predio: "#302636", predioEscuro: "#1a1420", luz: "#9a7038",
    altMin: 18, altMax: 36, densJanelas: 0.16,
    janelaArco: false, torres: false, bandeiras: false, calcamento: false,
    chao: "#1e1722", chaoDetalhe: "#31273a", lua: "#9a9384",
  },
  { // 2 Vida Decente — cidade baixa, calçamento
    ceuAlto: "#121226", ceuBaixo: "#292236", longe: "#1e1928",
    predio: "#2b2230", predioEscuro: "#1a1420", luz: "#a87c38",
    altMin: 26, altMax: 50, densJanelas: 0.26,
    janelaArco: false, torres: false, bandeiras: false, calcamento: true,
    chao: "#1d1720", chaoDetalhe: "#2a212e", lua: "#aca390",
  },
  { // 3 Prosperidade — cidade com bandeiras
    ceuAlto: "#15152e", ceuBaixo: "#302842", longe: "#231d33",
    predio: "#322838", predioEscuro: "#1f1826", luz: "#c09040",
    altMin: 34, altMax: 66, densJanelas: 0.34,
    janelaArco: true, torres: false, bandeiras: true, calcamento: true,
    chao: "#201925", chaoDetalhe: "#2e2434", lua: "#bcb29c",
  },
  { // 4 Excesso e Poder — distrito nobre, torres de catedral
    ceuAlto: "#191540", ceuBaixo: "#3a2c50", longe: "#2a2040",
    predio: "#3a2c42", predioEscuro: "#241a2e", luz: "#d4a44a",
    altMin: 44, altMax: 84, densJanelas: 0.42,
    janelaArco: true, torres: true, bandeiras: true, calcamento: true,
    chao: "#241c2b", chaoDetalhe: "#342640", lua: "#cabfa6",
  },
  { // 5 O Topo — palácio, céu régio, ouro por toda parte
    ceuAlto: "#1d1850", ceuBaixo: "#453260", longe: "#332650",
    predio: "#443252", predioEscuro: "#2c2038", luz: "#e8c460",
    altMin: 54, altMax: 100, densJanelas: 0.5,
    janelaArco: true, torres: true, bandeiras: true, calcamento: true,
    chao: "#281f30", chaoDetalhe: "#3a2b48", lua: "#d8ceb4",
  },
];

export function GameScene({ level, energia, momentum, pulso, nome }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const st = useRef({
    worldX: 0, energia, level, momentum,
    frameAndar: 0, tAndar: 0, frameFogo: 0, tFogo: 0,
    pulsoVisto: pulso, pulo: 0, flashLevel: 0, levelVisto: level,
    moedas: [] as Moeda[], particulas: [] as Particula[],
    proximaMoeda: 80,
  });

  useEffect(() => {
    const s = st.current;
    s.energia = energia;
    s.momentum = momentum;
    if (pulso !== s.pulsoVisto) {
      s.pulsoVisto = pulso;
      s.pulo = 1;
      for (let i = 0; i < 14; i++) {
        s.particulas.push({
          x: HEROI_X + 10, y: CHAO - 18,
          vx: (hash(pulso * 31 + i) - 0.5) * 70,
          vy: -50 - hash(pulso * 17 + i) * 55,
          vida: 1, cor: i % 3 === 0 ? "#e8cc7a" : "#c9a24f",
        });
      }
    }
    if (level !== s.levelVisto) {
      s.levelVisto = level;
      s.level = level;
      s.flashLevel = 1;
    }
  }, [energia, momentum, pulso, level]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let tAnterior = performance.now();

    function desenhar(agora: number) {
      const s = st.current;
      const c = ctx as CanvasRenderingContext2D;
      const dt = Math.min(0.05, (agora - tAnterior) / 1000);
      tAnterior = agora;

      const tier = tierDoLevel(s.level);
      const est = ESTAGIOS[tier]!;
      const andando = s.energia > 0.01;
      const veloc = andando ? 24 + s.momentum * 2 : 0;

      if (andando) {
        s.worldX += veloc * dt;
        s.energia = Math.max(0, s.energia - ENERGIA_POR_SEGUNDO * dt);
        s.tAndar += dt;
        if (s.tAndar > 0.085) { s.tAndar = 0; s.frameAndar = (s.frameAndar + 1) % 6; }
      }
      s.tFogo += dt;
      if (s.tFogo > 0.15) { s.tFogo = 0; s.frameFogo = (s.frameFogo + 1) % 3; }
      if (s.pulo > 0) s.pulo = Math.max(0, s.pulo - dt * 2.4);
      if (s.flashLevel > 0) s.flashLevel = Math.max(0, s.flashLevel - dt);

      // ---- CÉU: degradê em 3 faixas com dithering + estrelas + lua ----
      c.fillStyle = est.ceuAlto;
      c.fillRect(0, 0, W, 52);
      c.fillStyle = est.ceuBaixo;
      c.fillRect(0, 52, W, CHAO - 52);
      for (let x = 0; x < W; x += 2) {
        if (hash(x * 7) > 0.5) { c.fillStyle = est.ceuAlto; c.fillRect(x, 52, 1, 1); }
        if (hash(x * 13) > 0.6) { c.fillStyle = est.ceuAlto; c.fillRect(x + 1, 56, 1, 1); }
      }
      for (let i = 0; i < 46; i++) {
        const sx = Math.floor(hash(i * 13) * W);
        const sy = Math.floor(hash(i * 29) * 48);
        if (hash(i * 7 + Math.floor(agora / 800)) > 0.12) {
          c.fillStyle = i % 6 === 0 ? "#9a94ac" : "#5b5670";
          c.fillRect(sx, sy, 1, 1);
        }
      }
      // Lua com cratera e halo
      c.fillStyle = "rgba(210,200,170,0.06)";
      c.beginPath(); c.arc(266, 26, 16, 0, Math.PI * 2); c.fill();
      c.fillStyle = est.lua;
      c.beginPath(); c.arc(266, 26, 11, 0, Math.PI * 2); c.fill();
      c.fillStyle = est.ceuAlto;
      c.beginPath(); c.arc(261, 22, 9, 0, Math.PI * 2); c.fill();
      c.fillStyle = "rgba(0,0,0,0.12)";
      c.fillRect(268, 28, 3, 2); c.fillRect(271, 24, 2, 2);

      // ---- MONTANHAS ao longe (parallax 0.18) ----
      c.fillStyle = est.longe;
      const off02 = s.worldX * 0.18;
      for (let i = Math.floor(off02 / 64) - 1; i < Math.floor(off02 / 64) + 7; i++) {
        const bx = i * 64 - off02;
        const alt = 22 + Math.floor(hash(i * 101) * 26);
        c.beginPath();
        c.moveTo(bx, CHAO - 20);
        c.lineTo(bx + 32, CHAO - 20 - alt);
        c.lineTo(bx + 64, CHAO - 20);
        c.fill();
      }
      // Torres de catedral no horizonte (tiers altos)
      if (est.torres) {
        const offT = s.worldX * 0.3;
        for (let i = Math.floor(offT / 150) - 1; i < Math.floor(offT / 150) + 4; i++) {
          const tx = Math.floor(i * 150 - offT) + 60;
          if (tx < -20 || tx > W + 20) continue;
          const alt = 60 + Math.floor(hash(i * 211) * 24);
          c.fillStyle = est.longe;
          c.fillRect(tx, CHAO - 18 - alt, 10, alt);
          c.beginPath();
          c.moveTo(tx - 1, CHAO - 18 - alt);
          c.lineTo(tx + 5, CHAO - 30 - alt);
          c.lineTo(tx + 11, CHAO - 18 - alt);
          c.fill();
          c.fillStyle = est.luz;
          c.fillRect(tx + 4, CHAO - 26 - alt, 1, 5); // cruz
          c.fillRect(tx + 3, CHAO - 24 - alt, 3, 1);
          if (hash(i * 5 + Math.floor(agora / 1600)) > 0.3) {
            c.fillRect(tx + 4, CHAO - 10 - alt, 2, 3); // sineira acesa
          }
        }
      }

      // ---- PRÉDIOS (parallax 0.55) — arquitetura por estágio ----
      const off05 = s.worldX * 0.55;
      for (let i = Math.floor(off05 / 36) - 1; i < Math.floor(off05 / 36) + 11; i++) {
        const bx = Math.floor(i * 36 - off05);
        const alt = est.altMin + Math.floor(hash(i * 37) * (est.altMax - est.altMin));
        const larg = 24 + Math.floor(hash(i * 53) * 10);
        // corpo
        c.fillStyle = est.predio;
        c.fillRect(bx, CHAO - 10 - alt, larg, alt);
        // telhado: barraco torto (tier 0-1) vs cornija reta
        c.fillStyle = est.predioEscuro;
        if (tier <= 1) {
          const inclinacao = hash(i * 3) > 0.5 ? 2 : -2;
          c.beginPath();
          c.moveTo(bx - 2, CHAO - 10 - alt + 2);
          c.lineTo(bx + larg / 2, CHAO - 14 - alt + inclinacao);
          c.lineTo(bx + larg + 2, CHAO - 10 - alt + 2);
          c.lineTo(bx + larg + 2, CHAO - 8 - alt + 2);
          c.lineTo(bx - 2, CHAO - 8 - alt + 2);
          c.fill();
        } else {
          c.fillRect(bx - 1, CHAO - 12 - alt, larg + 2, 3);
          if (tier >= 4 && hash(i * 91) > 0.55) { // ameias nobres
            for (let a = 0; a < larg; a += 5) c.fillRect(bx + a, CHAO - 15 - alt, 3, 3);
          }
        }
        // faixa de sombra lateral
        c.fillStyle = est.predioEscuro;
        c.fillRect(bx + larg - 3, CHAO - 10 - alt, 3, alt);
        // janelas (arcos góticos nos tiers altos)
        for (let wy = 0; wy < Math.floor((alt - 6) / 9); wy++) {
          for (let wx = 0; wx < Math.floor(larg / 8); wx++) {
            if (hash(i * 997 + wy * 31 + wx * 7) >= est.densJanelas) continue;
            const jx = bx + 3 + wx * 8;
            const jy = CHAO - 16 - alt + wy * 9 + 5;
            const flicker = hash(i * 13 + wy * 7 + wx + Math.floor(agora / 1300)) > 0.05;
            c.fillStyle = flicker ? est.luz : "#3a3020";
            c.fillRect(jx, jy, 2, 3);
            if (est.janelaArco) c.fillRect(jx, jy - 1, 2, 1);
          }
        }
        // bandeiras/estandartes pendurados (tiers 3+)
        if (est.bandeiras && hash(i * 61) > 0.6) {
          const fx = bx + 4 + Math.floor(hash(i * 43) * (larg - 10));
          const onda = Math.floor(Math.sin(agora / 260 + i) * 1.5);
          c.fillStyle = tier >= 5 ? "#3a2a52" : "#4e2440";
          c.fillRect(fx, CHAO - 10 - alt + 4, 4, 8 + onda);
          c.fillStyle = est.luz;
          c.fillRect(fx + 1, CHAO - 10 - alt + 6, 2, 1);
        }
      }

      // ---- CHÃO ----
      c.fillStyle = est.chao;
      c.fillRect(0, CHAO - 10, W, H - CHAO + 10);
      c.fillStyle = est.chaoDetalhe;
      c.fillRect(0, CHAO - 10, W, 2);
      const off1 = s.worldX;
      if (est.calcamento) {
        // paralelepípedos em fileiras alternadas
        for (let fila = 0; fila < 3; fila++) {
          const fy = CHAO - 6 + fila * 5;
          const desloc = fila % 2 === 0 ? 0 : 7;
          for (let i = Math.floor(off1 / 14) - 1; i < Math.floor(off1 / 14) + 25; i++) {
            const px = Math.floor(i * 14 - off1) + desloc;
            c.fillStyle = hash(i * 71 + fila * 13) > 0.5 ? est.chaoDetalhe : est.chao;
            c.fillRect(px, fy, 12, 4);
            c.fillStyle = "rgba(0,0,0,0.25)";
            c.fillRect(px + 12, fy, 2, 4);
          }
        }
      } else {
        // terra batida com pedras e mato seco
        for (let i = Math.floor(off1 / 12); i < Math.floor(off1 / 12) + 30; i++) {
          const px = Math.floor(i * 12 - off1);
          const h1 = hash(i * 71);
          if (h1 > 0.5) {
            c.fillStyle = est.chaoDetalhe;
            c.fillRect(px, CHAO - 5 + Math.floor(hash(i * 3) * 10), 3 + Math.floor(h1 * 3), 2);
          }
          if (h1 < 0.18) {
            c.fillStyle = "#3a3226";
            c.fillRect(px, CHAO - 11, 1, 3);
            c.fillRect(px + 2, CHAO - 10, 1, 2);
          }
        }
      }

      // ---- LAMPIÕES (chão) ----
      for (let i = Math.floor(off1 / 120) - 1; i < Math.floor(off1 / 120) + 4; i++) {
        const lx = Math.floor(i * 120 - off1) + 34;
        if (lx < -14 || lx > W + 14) continue;
        const luzOsc = 0.7 + 0.3 * Math.sin(agora / 200 + i * 9);
        c.fillStyle = `rgba(220,170,80,${0.04 * luzOsc})`;
        c.fillRect(lx - 14, CHAO - 52, 30, 46);
        c.fillStyle = `rgba(220,170,80,${0.07 * luzOsc})`;
        c.fillRect(lx - 8, CHAO - 48, 18, 40);
        c.fillStyle = "#15101a";
        c.fillRect(lx, CHAO - 46, 2, 38);
        c.fillRect(lx - 4, CHAO - 48, 10, 2);
        c.fillRect(lx - 3, CHAO - 46, 2, 3);
        c.fillRect(lx + 3, CHAO - 46, 2, 3);
        c.fillStyle = `rgba(238,196,96,${luzOsc})`;
        c.fillRect(lx - 2, CHAO - 45, 6, 5);
        c.fillStyle = "#15101a";
        c.fillRect(lx - 3, CHAO - 40, 8, 1);
      }

      // ---- MOEDAS no caminho (escala 2, casando com o herói) ----
      if (andando) {
        s.proximaMoeda -= veloc * dt;
        if (s.proximaMoeda <= 0) {
          s.proximaMoeda = 70 + hash(Math.floor(s.worldX)) * 90;
          s.moedas.push({ wx: s.worldX + W - HEROI_X + 12, y: CHAO - 18, frame: 0 });
        }
      }
      for (const m of s.moedas) {
        m.frame = (m.frame + dt * 9) % 4;
        const mx = Math.floor(HEROI_X + (m.wx - s.worldX));
        const flutua = Math.floor(Math.sin(agora / 240 + m.wx) * 2);
        desenharSprite(c, MOEDA[Math.floor(m.frame)]!, PALETA_MOEDA, mx, Math.floor(m.y) + flutua, 2);
      }
      s.moedas = s.moedas.filter((m) => {
        const mx = HEROI_X + (m.wx - s.worldX);
        if (mx <= HEROI_X + 18) {
          for (let i = 0; i < 5; i++) {
            s.particulas.push({
              x: HEROI_X + 20, y: CHAO - 30, vx: (hash(m.wx + i) - 0.3) * 45,
              vy: -35 - hash(m.wx * 3 + i) * 30, vida: 0.7, cor: "#e8cc7a",
            });
          }
          return false;
        }
        return mx > -24;
      });

      // ---- HERÓI (escala 2 — presença de protagonista) ----
      const alturaPulo = Math.floor(Math.sin(s.pulo * Math.PI) * 14);
      if (andando || s.pulo > 0) {
        c.fillStyle = "rgba(0,0,0,0.4)";
        c.fillRect(HEROI_X + 8, CHAO - 1, 26, 3);
        desenharHeroiAndando(c, tier, s.frameAndar, HEROI_X, CHAO - 60 - alturaPulo, 2);
      } else {
        desenharSprite(c, FOGUEIRA[s.frameFogo]!, PALETA_FOGUEIRA, HEROI_X + 52, CHAO - 24, 2);
        if (hash(Math.floor(agora / 280)) > 0.45) {
          s.particulas.push({
            x: HEROI_X + 62 + hash(agora) * 6, y: CHAO - 22,
            vx: (hash(agora * 3) - 0.5) * 7, vy: -16 - hash(agora * 7) * 12,
            vida: 0.9, cor: hash(agora * 11) > 0.5 ? "#d4762f" : "#e8b34a",
          });
        }
        const fogoLuz = 0.5 + 0.5 * Math.sin(agora / 150);
        c.fillStyle = `rgba(232,150,60,${0.05 + 0.03 * fogoLuz})`;
        c.fillRect(HEROI_X + 10, CHAO - 54, 80, 50);
        c.fillStyle = "rgba(0,0,0,0.4)";
        c.fillRect(HEROI_X + 6, CHAO - 1, 30, 3);
        desenharHeroiSentado(c, tier, HEROI_X, CHAO - 40, 2);
      }

      // ---- PARTÍCULAS ----
      for (const p of s.particulas) {
        p.vida -= dt * 1.3;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 85 * dt;
        if (p.vida > 0) { c.fillStyle = p.cor; c.fillRect(Math.floor(p.x), Math.floor(p.y), 1, 1); }
      }
      s.particulas = s.particulas.filter((p) => p.vida > 0 && p.y < H);

      // ---- NÉVOA (clima gótico) ----
      for (let i = 0; i < 2; i++) {
        const fy = CHAO - 18 + i * 9;
        const foff = (agora / (55 + i * 30)) % W;
        c.fillStyle = `rgba(160,150,180,${0.05 - i * 0.015})`;
        for (let x = 0; x < W; x += 4) {
          const onda = Math.sin((x + foff) / 24 + i * 2) * 3;
          c.fillRect(x, fy + onda, 4, 7);
        }
      }

      // ---- FLASH de level up + vinheta ----
      if (s.flashLevel > 0) {
        c.fillStyle = `rgba(232,204,122,${s.flashLevel * 0.16})`;
        c.fillRect(0, 0, W, H);
      }
      c.fillStyle = "rgba(8,6,10,0.55)";
      c.fillRect(0, 0, W, 3);
      c.fillRect(0, H - 3, W, 3);
      c.fillRect(0, 0, 3, H);
      c.fillRect(W - 3, 0, 3, H);

      // ---- PLACA do estágio ----
      const t = TIERS[tier]!;
      const rotulo = `${t.nome} · ${t.sub}`;
      c.fillStyle = "rgba(8,6,10,0.6)";
      c.fillRect(6, 6, rotulo.length * 5 + 10, 12);
      c.fillStyle = "#b8ac96";
      c.font = "7px monospace";
      c.fillText(rotulo, 11, 15);

      if (!reduzido) raf = requestAnimationFrame(desenhar);
    }

    raf = requestAnimationFrame(desenhar);
    return () => cancelAnimationFrame(raf);
  }, []);

  const tierAgora = tierDoLevel(level);
  return (
    <div className="sq-scene" role="img"
      aria-label={`${nome}, ${TIERS[tierAgora]!.nome}, ${energia > 0 ? "caminhando" : "descansando na fogueira"}`}>
      <canvas ref={canvasRef} width={W} height={H} />
    </div>
  );
}
