import { describe, it, expect } from "vitest";
import { type EstadoPersonagem } from "./engine";
import { estagioAtual, requisitoAtendido, ESTAGIOS } from "./estagios";
import { aplicarEfeito, aplicarEfeitos, type Efeito } from "./efeitos";
import { eventosDisparados, type EventoDef } from "./eventos";
import { fraseDoDia } from "./narrativa";

function estadoBase(over: Partial<EstadoPersonagem> = {}): EstadoPersonagem {
  return {
    level: 1,
    xp: 0,
    ouro: 0,
    energia: 50,
    momentum: 0,
    atributos: { fortuna: 0, mente: 0, carreira: 0, vigor: 0 },
    lastTick: new Date("2026-07-02T12:00:00Z"),
    ultimoCheckinDia: null,
    sistemas: {},
    ...over,
  };
}

describe("estágios de vida", () => {
  it("nível 1 é o Maltrapilho (estágio 0, sem bônus de produção)", () => {
    const e = estagioAtual(estadoBase());
    expect(e.ordem).toBe(0);
    expect(e.multOuro).toBe(1);
  });

  it("sobe de estágio ao cruzar o nível mínimo (salto discreto)", () => {
    const e = estagioAtual(estadoBase({ level: 8 }));
    expect(e.nome).toBe("Rapaz Comum");
    expect(e.multOuro).toBeGreaterThan(1);
  });

  it("pega sempre o estágio de maior ordem atendido", () => {
    const e = estagioAtual(estadoBase({ level: 99 }));
    expect(e.ordem).toBe(ESTAGIOS[ESTAGIOS.length - 1]!.ordem);
  });

  it("requisito por atributo (tarefa muda sistema, não só nível)", () => {
    expect(requisitoAtendido({ atributo: "carreira", min: 10 }, estadoBase())).toBe(false);
    expect(requisitoAtendido({ atributo: "carreira", min: 10 }, estadoBase({ atributos: { fortuna: 0, mente: 0, carreira: 10, vigor: 0 } }))).toBe(true);
  });
});

describe("efeitos (interpretador genérico)", () => {
  it("ouro nunca fica negativo", () => {
    expect(aplicarEfeito(estadoBase({ ouro: 100 }), { tipo: "ouro", delta: -500 }).ouro).toBe(0);
  });

  it("energia respeita o máximo", () => {
    const r = aplicarEfeito(estadoBase({ energia: 90 }), { tipo: "energia", delta: 50 });
    expect(r.energia).toBe(100);
  });

  it("sistema grava sub-estado plugável", () => {
    const r = aplicarEfeito(estadoBase(), { tipo: "sistema", chave: "empregoAtual", valor: "clt" });
    expect(r.sistemas.empregoAtual).toBe("clt");
  });

  it("aplica lista de efeitos em ordem", () => {
    const efeitos: Efeito[] = [
      { tipo: "ouro", delta: 500 },
      { tipo: "atributo", atributo: "vigor", delta: 3 },
    ];
    const r = aplicarEfeitos(estadoBase(), efeitos);
    expect(r.ouro).toBe(500);
    expect(r.atributos.vigor).toBe(3);
  });
});

describe("eventos de escolha", () => {
  const def: EventoDef = {
    id: "oferta-clt",
    gatilho: { atributo: "carreira", min: 5 },
    titulo: "Oferta de emprego",
    texto: "Uma guilda ofereceu um contrato fixo.",
    opcoes: [
      { id: "aceitar", label: "Aceitar", efeitos: [{ tipo: "sistema", chave: "empregoAtual", valor: "clt" }] },
      { id: "recusar", label: "Recusar", efeitos: [] },
    ],
  };

  it("dispara quando o gatilho é atendido e não foi resolvido", () => {
    const estado = estadoBase({ atributos: { fortuna: 0, mente: 0, carreira: 5, vigor: 0 } });
    expect(eventosDisparados(estado, [def], new Set()).map((e) => e.id)).toEqual(["oferta-clt"]);
  });

  it("não dispara se já resolvido", () => {
    const estado = estadoBase({ atributos: { fortuna: 0, mente: 0, carreira: 5, vigor: 0 } });
    expect(eventosDisparados(estado, [def], new Set(["oferta-clt"]))).toEqual([]);
  });

  it("não dispara sem gatilho atendido", () => {
    expect(eventosDisparados(estadoBase(), [def], new Set())).toEqual([]);
  });
});

describe("frase narrativa", () => {
  it("conta o grind offline quando houve ganho", () => {
    const f = fraseDoDia(estadoBase(), "Aria", { ouro: 120, xp: 40, levels: 1, horas: 3 });
    expect(f).toContain("Aria");
    expect(f).toContain("+120");
    expect(f).toContain("nível");
  });

  it("avisa quando está sem energia", () => {
    expect(fraseDoDia(estadoBase({ energia: 0 }), "Aria", null)).toContain("fogueira");
  });
});
