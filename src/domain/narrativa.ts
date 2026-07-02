/**
 * Frase narrativa diária — o hook de 5 segundos.
 *
 * Traduz o estado + o "enquanto você estava fora" numa frase ESPECÍFICA do
 * momento da vida do personagem, não um log de números. É a menor unidade que
 * entrega o "quero ver o que acontece com ele depois" todo dia.
 */

import { type EstadoPersonagem } from "./engine";
import { estagioAtual } from "./estagios";

export interface GanhosOffline {
  readonly ouro: number;
  readonly xp: number;
  readonly levels: number;
  readonly horas: number;
}

/** Frase do dia derivada do estado atual e dos ganhos offline (se houve). */
export function fraseDoDia(
  estado: EstadoPersonagem,
  nome: string,
  ganhos: GanhosOffline | null,
): string {
  const estagio = estagioAtual(estado);

  if (ganhos && ganhos.ouro > 0) {
    const trechoLevel =
      ganhos.levels > 0
        ? ` e subiu ${ganhos.levels === 1 ? "de nível" : `${ganhos.levels} níveis`}`
        : "";
    return `Enquanto você estava fora, ${nome} grindou ${ganhos.horas}h como ${estagio.nome}: +${ganhos.ouro} de ouro${trechoLevel}.`;
  }

  if (estado.energia <= 0) {
    return `${nome} descansa na fogueira, sem energia. Uma ação real hoje o coloca de volta na estrada.`;
  }

  return `${nome} segue a vida de ${estagio.nome} (${estagio.sub}). O momentum está em x${(1 + estado.momentum * 0.1).toFixed(1)}.`;
}
