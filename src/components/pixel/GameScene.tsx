"use client";

/**
 * Cena viva do Side Quest — pixel art 2D com parallax (clima Blasphemous).
 * O herói CAMINHA enquanto tem energia (idle avançando); sem energia, senta
 * numa fogueira e descansa. O cenário e as roupas evoluem com o level:
 * beco pobre → vila → cidade → cidade alta.
 * Render: buffer interno 320×144 escalado com pixels nítidos; rAF + Δt.
 */

import { useEffect, useRef } from "react";
import {
  desenharSprite, paletaHeroi, tierDoLevel,
  HEROI_CORPO, HEROI_PERNAS_ANDAR, HEROI_SENTADO,
  FOGUEIRA, PALETA_FOGUEIRA, MOEDA, PALETA_MOEDA,
} from "./sprites";

const W = 320;
const H = 144;
const CHAO = 122;
const HEROI_X = 118;
const ENERGIA_POR_SEGUNDO = 10 / 3600; // espelha ENERGIA_POR_HORA do engine

interface Props {
  readonly level: number;
  readonly energia: number;
  readonly momentum: number;
  /** Incrementa a cada check-in — dispara salto + chuva de moedas. */
  readonly pulso: number;
  readonly nome: string;
}

interface Moeda { wx: number; vy: number; y: number; frame: number }
interface Particula { x: number; y: number; vx: number; vy: number; vida: number; cor: string }

function hash(n: number): number {
  let h = (n | 0) * 2654435761;
  h = (h ^ (h >>> 16)) >>> 0;
  return h / 4294967296;
}

interface Estagio {
  ceu: [string, string];
  longe: string;
  predioCor: string;
  predioLuz: string;
  alturaMin: number;
  alturaMax: number;
  densidadeJanelas: number;
  nome: string;
}

function estagioDoLevel(level: number): Estagio {
  const t = tierDoLevel(level);
  const est: readonly Estagio[] = [
    { ceu: ["#12101c", "#241d2e"], longe: "#1a1622", predioCor: "#221c26", predioLuz: "#7a5c30", alturaMin: 18, alturaMax: 34, densidadeJanelas: 0.12, nome: "Beco das Sombras" },
    { ceu: ["#141425", "#2a2338"], longe: "#1e1a2a", predioCor: "#282130", predioLuz: "#9a7438", alturaMin: 24, alturaMax: 44, densidadeJanelas: 0.22, nome: "Vila do Cadastro" },
    { ceu: ["#171730", "#302844"], longe: "#242038", predioCor: "#2e2738", predioLuz: "#b98e44", alturaMin: 34, alturaMax: 62, densidadeJanelas: 0.34, nome: "Cidade Baixa" },
    { ceu: ["#1b1b3a", "#383054"], longe: "#2a2544", predioCor: "#363044", predioLuz: "#d4ac54", alturaMin: 44, alturaMax: 80, densidadeJanelas: 0.45, nome: "Cidade Alta" },
  ];
  return est[t]!;
}

export function GameScene({ level, energia, momentum, pulso, nome }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const st = useRef({
    worldX: 0, energia, level, momentum,
    frameAndar: 0, tAndar: 0, frameFogo: 0, tFogo: 0,
    pulsoVisto: pulso, pulo: 0,
    moedas: [] as Moeda[], particulas: [] as Particula[],
    proximaMoeda: 80, levelVisto: level, flashLevel: 0,
  });

  // Sincroniza props → estado mutável da cena (sem reiniciar o loop).
  useEffect(() => {
    const s = st.current;
    s.energia = energia;
    s.momentum = momentum;
    if (pulso !== s.pulsoVisto) {
      s.pulsoVisto = pulso;
      s.pulo = 1;
      for (let i = 0; i < 12; i++) {
        s.particulas.push({
          x: HEROI_X + 8, y: CHAO - 14,
          vx: (hash(pulso * 31 + i) - 0.5) * 60,
          vy: -40 - hash(pulso * 17 + i) * 50,
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
      const dt = Math.min(0.05, (agora - tAnterior) / 1000);
      tAnterior = agora;

      const andando = s.energia > 0.01;
      const veloc = andando ? 26 + s.momentum * 2.2 : 0;
      if (andando) {
        s.worldX += veloc * dt;
        // Drena a energia visualmente no mesmo ritmo do engine (fonte da verdade = servidor).
        s.energia = Math.max(0, s.energia - ENERGIA_POR_SEGUNDO * dt);
        s.tAndar += dt;
        if (s.tAndar > 0.11) { s.tAndar = 0; s.frameAndar = (s.frameAndar + 1) % 4; }
      }
      s.tFogo += dt;
      if (s.tFogo > 0.16) { s.tFogo = 0; s.frameFogo = (s.frameFogo + 1) % 3; }
      if (s.pulo > 0) s.pulo = Math.max(0, s.pulo - dt * 2.6);
      if (s.flashLevel > 0) s.flashLevel = Math.max(0, s.flashLevel - dt * 1.2);

      const est = estagioDoLevel(s.level);
      const c = ctx as CanvasRenderingContext2D;

      // Céu (duas faixas com dithering na junção) + estrelas + lua
      c.fillStyle = est.ceu[0];
      c.fillRect(0, 0, W, 60);
      c.fillStyle = est.ceu[1];
      c.fillRect(0, 60, W, CHAO - 60);
      for (let x = 0; x < W; x += 2) {
        if (hash(x * 7) > 0.5) { c.fillStyle = est.ceu[0]; c.fillRect(x, 60, 1, 1); }
      }
      for (let i = 0; i < 40; i++) {
        const sx = Math.floor(hash(i * 13) * W);
        const sy = Math.floor(hash(i * 29) * 55);
        const pisca = hash(i * 7 + Math.floor(agora / 900)) > 0.15;
        if (pisca) { c.fillStyle = i % 5 === 0 ? "#8a86a0" : "#55516a"; c.fillRect(sx, sy, 1, 1); }
      }
      c.fillStyle = "#c9c4b4";
      c.beginPath(); c.arc(262, 26, 11, 0, Math.PI * 2); c.fill();
      c.fillStyle = est.ceu[0];
      c.beginPath(); c.arc(258, 23, 10, 0, Math.PI * 2); c.fill();

      // Montanhas ao longe (parallax 0.2)
      c.fillStyle = est.longe;
      const off02 = s.worldX * 0.2;
      for (let i = Math.floor(off02 / 60) - 1; i < Math.floor(off02 / 60) + 8; i++) {
        const bx = i * 60 - off02;
        const alt = 24 + Math.floor(hash(i * 101) * 22);
        c.beginPath();
        c.moveTo(bx, CHAO - 18);
        c.lineTo(bx + 30, CHAO - 18 - alt);
        c.lineTo(bx + 60, CHAO - 18);
        c.fill();
      }

      // Prédios (parallax 0.55) — o estágio muda a silhueta da cidade
      const off05 = s.worldX * 0.55;
      for (let i = Math.floor(off05 / 34) - 1; i < Math.floor(off05 / 34) + 11; i++) {
        const bx = Math.floor(i * 34 - off05);
        const alt = est.alturaMin + Math.floor(hash(i * 37) * (est.alturaMax - est.alturaMin));
        const larg = 22 + Math.floor(hash(i * 53) * 10);
        c.fillStyle = est.predioCor;
        c.fillRect(bx, CHAO - 8 - alt, larg, alt);
        c.fillStyle = "#141018";
        c.fillRect(bx, CHAO - 8 - alt, larg, 2);
        for (let wy = 0; wy < Math.floor(alt / 8); wy++) {
          for (let wx = 0; wx < Math.floor(larg / 7); wx++) {
            const acesa = hash(i * 997 + wy * 31 + wx * 7) < est.densidadeJanelas;
            if (!acesa) continue;
            const flicker = hash(i * 13 + wy * 7 + wx + Math.floor(agora / 1400)) > 0.06;
            c.fillStyle = flicker ? est.predioLuz : "#3a3020";
            c.fillRect(bx + 3 + wx * 7, CHAO - 14 - alt + wy * 8 + 4, 2, 3);
          }
        }
      }

      // Chão
      c.fillStyle = "#1c171d";
      c.fillRect(0, CHAO - 8, W, H - CHAO + 8);
      c.fillStyle = "#292130";
      c.fillRect(0, CHAO - 8, W, 2);
      const off1 = s.worldX;
      for (let i = Math.floor(off1 / 14); i < Math.floor(off1 / 14) + 25; i++) {
        const px = Math.floor(i * 14 - off1);
        if (hash(i * 71) > 0.45) {
          c.fillStyle = "#241d2b";
          c.fillRect(px, CHAO - 5 + Math.floor(hash(i * 3) * 8), 3 + Math.floor(hash(i * 11) * 3), 2);
        }
      }

      // Lampiões góticos (camada do chão)
      for (let i = Math.floor(off1 / 110) - 1; i < Math.floor(off1 / 110) + 4; i++) {
        const lx = Math.floor(i * 110 - off1) + 30;
        if (lx < -10 || lx > W + 10) continue;
        c.fillStyle = "rgba(216,166,74,0.05)";
        c.fillRect(lx - 12, CHAO - 46, 26, 40);
        c.fillStyle = "rgba(216,166,74,0.08)";
        c.fillRect(lx - 7, CHAO - 42, 16, 34);
        c.fillStyle = "#171219";
        c.fillRect(lx, CHAO - 40, 2, 32);
        c.fillRect(lx - 3, CHAO - 42, 8, 3);
        const luzOsc = 0.75 + 0.25 * Math.sin(agora / 220 + i * 9);
        c.fillStyle = `rgba(232,190,90,${luzOsc})`;
        c.fillRect(lx - 1, CHAO - 39, 4, 4);
      }

      // Moedas no caminho (só andando): nascem à frente, o herói coleta
      if (andando) {
        s.proximaMoeda -= veloc * dt;
        if (s.proximaMoeda <= 0) {
          s.proximaMoeda = 70 + hash(Math.floor(s.worldX)) * 80;
          s.moedas.push({ wx: s.worldX + W - HEROI_X + 10, vy: 0, y: CHAO - 12, frame: 0 });
        }
      }
      for (const m of s.moedas) {
        m.frame = (m.frame + dt * 9) % 4;
        const mx = Math.floor(HEROI_X + (m.wx - s.worldX));
        desenharSprite(c, MOEDA[Math.floor(m.frame)]!, PALETA_MOEDA, mx, Math.floor(m.y));
      }
      s.moedas = s.moedas.filter((m) => {
        const mx = HEROI_X + (m.wx - s.worldX);
        if (mx <= HEROI_X + 10) {
          for (let i = 0; i < 4; i++) {
            s.particulas.push({
              x: HEROI_X + 8, y: CHAO - 16, vx: (hash(m.wx + i) - 0.3) * 40,
              vy: -30 - hash(m.wx * 3 + i) * 30, vida: 0.7, cor: "#e8cc7a",
            });
          }
          return false;
        }
        return mx > -20;
      });

      // Herói (ou descanso na fogueira)
      const paleta = paletaHeroi(tierDoLevel(s.level));
      const bob = andando && (s.frameAndar === 1 || s.frameAndar === 3) ? 1 : 0;
      const alturaPulo = Math.floor(Math.sin(s.pulo * Math.PI) * 10);
      if (andando || s.pulo > 0) {
        const hy = CHAO - 22 + bob - alturaPulo;
        c.fillStyle = "rgba(0,0,0,0.35)";
        c.fillRect(HEROI_X + 3, CHAO - 1, 11, 2);
        desenharSprite(c, HEROI_PERNAS_ANDAR[s.frameAndar]!, paleta, HEROI_X, hy + 16);
        desenharSprite(c, HEROI_CORPO, paleta, HEROI_X, hy);
      } else {
        desenharSprite(c, FOGUEIRA[s.frameFogo]!, PALETA_FOGUEIRA, HEROI_X + 20, CHAO - 10);
        if (hash(Math.floor(agora / 300)) > 0.4) {
          s.particulas.push({
            x: HEROI_X + 25 + hash(agora) * 4, y: CHAO - 10,
            vx: (hash(agora * 3) - 0.5) * 6, vy: -14 - hash(agora * 7) * 10,
            vida: 0.9, cor: hash(agora * 11) > 0.5 ? "#d97b32" : "#e8b34a",
          });
        }
        c.fillStyle = "rgba(0,0,0,0.35)";
        c.fillRect(HEROI_X + 2, CHAO - 1, 12, 2);
        desenharSprite(c, HEROI_SENTADO, paleta, HEROI_X, CHAO - 16);
        c.fillStyle = "rgba(232,179,74,0.06)";
        c.fillRect(HEROI_X + 8, CHAO - 30, 34, 26);
      }

      // Partículas
      for (const p of s.particulas) {
        p.vida -= dt * 1.4;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 90 * dt;
        if (p.vida > 0) { c.fillStyle = p.cor; c.fillRect(Math.floor(p.x), Math.floor(p.y), 1, 1); }
      }
      s.particulas = s.particulas.filter((p) => p.vida > 0 && p.y < H);

      // Névoa (duas faixas em movimento, clima gótico)
      for (let i = 0; i < 2; i++) {
        const fy = CHAO - 16 + i * 8;
        const foff = (agora / (60 + i * 25)) % W;
        c.fillStyle = `rgba(150,140,170,${0.05 - i * 0.015})`;
        for (let x = 0; x < W; x += 4) {
          const ondas = Math.sin((x + foff) / 22 + i) * 3;
          c.fillRect(x, fy + ondas, 4, 6);
        }
      }

      // Flash dourado de level up
      if (s.flashLevel > 0) {
        c.fillStyle = `rgba(232,204,122,${s.flashLevel * 0.18})`;
        c.fillRect(0, 0, W, H);
      }

      // Vinheta (bordas escuras)
      c.fillStyle = "rgba(10,8,12,0.5)";
      c.fillRect(0, 0, W, 3);
      c.fillRect(0, H - 3, W, 3);

      // Placa do estágio
      c.fillStyle = "rgba(10,8,12,0.55)";
      c.fillRect(6, 6, est.nome.length * 5 + 8, 11);
      c.fillStyle = "#a89e8e";
      c.font = "7px monospace";
      c.fillText(est.nome, 10, 14);

      if (!reduzido) raf = requestAnimationFrame(desenhar);
    }

    raf = requestAnimationFrame(desenhar);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="sq-scene" role="img"
      aria-label={`${nome} ${energia > 0 ? "caminhando pela" : "descansando na"} ${estagioDoLevel(level).nome}`}>
      <canvas ref={canvasRef} width={W} height={H} />
    </div>
  );
}
