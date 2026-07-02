import { describe, it, expect } from "vitest";
import {
  tick,
  aplicarCheckin,
  decairMomentum,
  multiplicadorMomentum,
  xpParaProximoLevel,
  energiaMaxima,
  diaLocal,
  ENERGIA_POR_HORA,
  OURO_BASE_HORA,
  MOMENTUM_MAX,
  type EstadoPersonagem,
} from "./engine";

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
    ...over,
  };
}

describe("tick (produção idle)", () => {
  it("produz ouro/xp proporcional ao tempo enquanto há energia", () => {
    const r = tick(estadoBase(), new Date("2026-07-02T14:00:00Z")); // 2h, energia p/ 5h
    expect(r.horasProdutivas).toBe(2);
    expect(r.ouroGanho).toBe(2 * OURO_BASE_HORA);
    expect(r.estado.energia).toBe(50 - 2 * ENERGIA_POR_HORA);
  });

  it("sem energia o herói descansa: produção zero, sem punição", () => {
    const r = tick(estadoBase({ energia: 0 }), new Date("2026-07-03T12:00:00Z"));
    expect(r.ouroGanho).toBe(0);
    expect(r.xpGanho).toBe(0);
    expect(r.estado.ouro).toBe(0);
  });

  it("produção para quando a energia acaba no meio do intervalo", () => {
    const r = tick(estadoBase({ energia: 10 }), new Date("2026-07-02T22:00:00Z")); // 10h, energia p/ 1h
    expect(r.horasProdutivas).toBe(1);
    expect(r.estado.energia).toBe(0);
  });

  it("é determinístico: dois ticks parciais = um tick inteiro", () => {
    const meio = tick(estadoBase(), new Date("2026-07-02T13:00:00Z"));
    const fim = tick(meio.estado, new Date("2026-07-02T14:00:00Z"));
    const inteiro = tick(estadoBase(), new Date("2026-07-02T14:00:00Z"));
    expect(meio.ouroGanho + fim.ouroGanho).toBe(inteiro.ouroGanho);
    expect(fim.estado.energia).toBe(inteiro.estado.energia);
  });

  it("sobe de level quando o xp idle cruza a curva", () => {
    // 100 xp para sair do lvl 1; 30xp/h → ~4h com energia suficiente
    const r = tick(estadoBase({ energia: 100 }), new Date("2026-07-02T17:00:00Z")); // 5h
    expect(r.levelsGanhos).toBe(1);
    expect(r.estado.level).toBe(2);
  });
});

describe("momentum (nunca pune de uma vez)", () => {
  it("decai 1 passo por dia vazio, não zera", () => {
    expect(decairMomentum(5, "2026-07-01", "2026-07-02")).toBe(5); // ontem→hoje: sem gap
    expect(decairMomentum(5, "2026-06-29", "2026-07-02")).toBe(3); // 2 dias vazios
    expect(decairMomentum(2, "2026-06-01", "2026-07-02")).toBe(0); // nunca negativo
  });

  it("multiplicador vai de x1.0 a x2.0", () => {
    expect(multiplicadorMomentum(0)).toBe(1);
    expect(multiplicadorMomentum(MOMENTUM_MAX)).toBe(2);
  });
});

describe("aplicarCheckin (recompensa imediata)", () => {
  const missao = { dominio: "fortuna" as const, xp: 50, energia: 20 };

  it("dá xp, energia, atributo e momentum no 1º check-in do dia", () => {
    const r = aplicarCheckin(estadoBase(), missao, false, new Date("2026-07-02T20:00:00Z"));
    expect(r.xpGanho).toBe(50);
    expect(r.energiaGanha).toBe(20);
    expect(r.estado.atributos.fortuna).toBe(1);
    expect(r.momentumNovo).toBe(1);
    expect(r.estado.ultimoCheckinDia).toBe(diaLocal(new Date("2026-07-02T20:00:00Z")));
  });

  it("crítico (prova anexada) = +50% de xp", () => {
    const r = aplicarCheckin(estadoBase(), missao, true, new Date());
    expect(r.xpGanho).toBe(75);
  });

  it("2º check-in do mesmo dia não sobe momentum de novo", () => {
    const agora = new Date("2026-07-02T20:00:00Z");
    const r1 = aplicarCheckin(estadoBase(), missao, false, agora);
    const r2 = aplicarCheckin(r1.estado, missao, false, agora);
    expect(r2.momentumNovo).toBe(1);
  });

  it("energia respeita o máximo (100 + vigor*5)", () => {
    const cheio = estadoBase({ energia: 95 });
    const r = aplicarCheckin(cheio, missao, false, new Date());
    expect(r.energiaGanha).toBe(5);
    expect(r.estado.energia).toBe(100);
  });

  it("vigor aumenta a energia máxima", () => {
    expect(energiaMaxima({ fortuna: 0, mente: 0, carreira: 0, vigor: 4 })).toBe(120);
  });
});

describe("curva de level", () => {
  it("cresce suave (100, ~283, ~520...)", () => {
    expect(xpParaProximoLevel(1)).toBe(100);
    expect(xpParaProximoLevel(2)).toBe(283);
    expect(xpParaProximoLevel(3)).toBe(520);
  });
});
