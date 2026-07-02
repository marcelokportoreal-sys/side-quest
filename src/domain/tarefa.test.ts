import { describe, it, expect } from "vitest";
import { validarNovaTarefa, recompensaDe, RECOMPENSAS } from "./tarefa";

describe("validarNovaTarefa", () => {
  const base = { titulo: "Enviar 3 candidaturas", dominio: "carreira", tipo: "diaria", dificuldade: "media" };

  it("aceita entrada válida e normaliza", () => {
    const r = validarNovaTarefa({ ...base, titulo: "  Treino  ", descricao: "  30min  " });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.valor.titulo).toBe("Treino");
      expect(r.valor.descricao).toBe("30min");
      expect(r.valor.dominio).toBe("carreira");
    }
  });

  it("rejeita título curto", () => {
    expect(validarNovaTarefa({ ...base, titulo: "a" }).ok).toBe(false);
  });

  it("rejeita domínio inválido", () => {
    expect(validarNovaTarefa({ ...base, dominio: "sorte" }).ok).toBe(false);
  });

  it("rejeita tipo e dificuldade inválidos", () => {
    expect(validarNovaTarefa({ ...base, tipo: "sempre" }).ok).toBe(false);
    expect(validarNovaTarefa({ ...base, dificuldade: "impossivel" }).ok).toBe(false);
  });

  it("descrição vazia vira null", () => {
    const r = validarNovaTarefa({ ...base, descricao: "   " });
    expect(r.ok && r.valor.descricao).toBe(null);
  });
});

describe("economia de recompensa", () => {
  it("dificuldade mapeia para preset fixo (anti-exploit)", () => {
    expect(recompensaDe("media")).toEqual(RECOMPENSAS.media);
    expect(recompensaDe("epica").xp).toBeGreaterThan(recompensaDe("trivial").xp);
    expect(recompensaDe("epica").energia).toBeGreaterThan(recompensaDe("trivial").energia);
  });
});
