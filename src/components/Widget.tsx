"use client";

/**
 * Widget enxuto — a casca "sempre no canto da tela" (Tamagotchi moderno).
 * Só a cena viva + a frase do dia + uma linha de recursos. Sem missões: abrir
 * custa < 5 segundos de atenção. É a rota que a casca desktop (Tauri) exibe
 * numa janela sem borda, always-on-top.
 */

import { type VisaoJogo } from "@/domain/game.service";
import { GameScene } from "@/components/pixel/GameScene";

export function Widget({ jogo }: { jogo: VisaoJogo }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: ".4rem", padding: ".4rem" }} data-tauri-drag-region>
      <GameScene level={jogo.level} energia={jogo.energia} momentum={jogo.momentum} pulso={0} nome={jogo.nome} />
      <p style={{ margin: 0, fontSize: ".8rem", lineHeight: 1.3 }}>🏕️ {jogo.frase}</p>
      <div className="sq-res" style={{ fontSize: ".78rem" }}>
        <span className="chip">🪙 {jogo.ouro.toLocaleString("pt-BR")}</span>
        <span className="chip">⚡ {jogo.energia}/{jogo.energiaMax}</span>
        <span className="chip">🔥 x{(1 + jogo.momentum * 0.1).toFixed(1)}</span>
        <span className="chip">🧭 {jogo.estagio.nome}</span>
      </div>
      {jogo.eventos.length > 0 && (
        <a href="/" style={{ fontSize: ".78rem", color: "var(--sq-gold)" }}>
          ✨ {jogo.eventos.length} escolha{jogo.eventos.length > 1 ? "s" : ""} esperando — abrir o jogo
        </a>
      )}
    </div>
  );
}
