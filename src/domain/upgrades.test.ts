import { describe, it, expect } from "vitest";
import { UPGRADES, bonusDeUpgrades, nivelUpgrade, custoProximoNivel } from "./upgrades";

describe("upgrades (sink de ouro)", () => {
  it("nível 0 quando não comprado; custo cresce geometricamente", () => {
    const picareta = UPGRADES.find((u) => u.id === "picareta")!;
    expect(nivelUpgrade({}, "picareta")).toBe(0);
    const c0 = custoProximoNivel(picareta, 0);
    const c1 = custoProximoNivel(picareta, 1);
    expect(c1).toBeGreaterThan(c0);
  });

  it("bônus escala com o nível guardado em sistemas.upgrades", () => {
    const semNada = bonusDeUpgrades({});
    expect(semNada.ouroMult).toBe(1);
    expect(semNada.energiaMaxBonus).toBe(0);

    const comUpgrades = bonusDeUpgrades({ upgrades: { picareta: 2, cantil: 3, folego: 2 } });
    expect(comUpgrades.ouroMult).toBeCloseTo(1.5); // +25%*2
    expect(comUpgrades.energiaMaxBonus).toBe(60); // +20*3
    expect(comUpgrades.eficienciaEnergia).toBeCloseTo(0.1); // 5%*2
  });

  it("custo é Infinity no nível máximo", () => {
    const folego = UPGRADES.find((u) => u.id === "folego")!;
    expect(custoProximoNivel(folego, folego.nivelMax)).toBe(Infinity);
  });

  it("eficiência de energia é limitada (não zera o consumo)", () => {
    const b = bonusDeUpgrades({ upgrades: { folego: 999 } });
    expect(b.eficienciaEnergia).toBeLessThanOrEqual(0.4);
  });
});
