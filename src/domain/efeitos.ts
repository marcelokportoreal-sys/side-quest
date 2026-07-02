/**
 * Interpretador genérico de EFEITOS — puro e determinístico.
 *
 * É o que faz "adicionar um evento" ser um INSERT de migration em vez de um PR
 * de engine: os efeitos de cada opção de evento são deltas estruturados (dados),
 * aplicados aqui por um redutor único. Nada de função TS específica por evento.
 */

import { type EstadoPersonagem, type Dominio, energiaMaxima } from "./engine";

export type Efeito =
  | { readonly tipo: "ouro"; readonly delta: number }
  | { readonly tipo: "energia"; readonly delta: number }
  | { readonly tipo: "momentum"; readonly delta: number }
  | { readonly tipo: "atributo"; readonly atributo: Dominio; readonly delta: number }
  | { readonly tipo: "sistema"; readonly chave: string; readonly valor: unknown };

/** Aplica UM efeito ao estado, respeitando limites (energia ≤ máx, ouro ≥ 0). */
export function aplicarEfeito(estado: EstadoPersonagem, efeito: Efeito): EstadoPersonagem {
  switch (efeito.tipo) {
    case "ouro":
      return { ...estado, ouro: Math.max(0, estado.ouro + efeito.delta) };
    case "energia":
      return {
        ...estado,
        energia: Math.max(0, Math.min(energiaMaxima(estado.atributos), estado.energia + efeito.delta)),
      };
    case "momentum":
      return { ...estado, momentum: Math.max(0, estado.momentum + efeito.delta) };
    case "atributo":
      return {
        ...estado,
        atributos: {
          ...estado.atributos,
          [efeito.atributo]: (estado.atributos[efeito.atributo] ?? 0) + efeito.delta,
        },
      };
    case "sistema":
      return { ...estado, sistemas: { ...estado.sistemas, [efeito.chave]: efeito.valor } };
  }
}

/** Aplica uma lista de efeitos em ordem (a escolha de uma opção de evento). */
export function aplicarEfeitos(estado: EstadoPersonagem, efeitos: readonly Efeito[]): EstadoPersonagem {
  return efeitos.reduce(aplicarEfeito, estado);
}
