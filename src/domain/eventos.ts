/**
 * Eventos de escolha — a agência / bifurcação da vida.
 *
 * Um evento é DADO: um gatilho declarativo + opções, cada opção com efeitos
 * (ver efeitos.ts). Quando o gatilho é atendido e o evento ainda não foi
 * resolvido, ele é oferecido ao jogador. A escolha altera as REGRAS da vida
 * (troca de emprego, investir vs guardar), não só um número.
 */

import { type EstadoPersonagem } from "./engine";
import { type Efeito } from "./efeitos";
import { requisitoAtendido, type RequisitoEstagio } from "./estagios";

export interface OpcaoEvento {
  readonly id: string;
  readonly label: string;
  readonly efeitos: readonly Efeito[];
}

export interface EventoDef {
  readonly id: string;
  /** Mesmo formato declarativo dos estágios: nível e/ou atributo cruzando limiar. */
  readonly gatilho: RequisitoEstagio;
  readonly titulo: string;
  readonly texto: string;
  readonly opcoes: readonly OpcaoEvento[];
  /** Se true, só dispara uma vez na vida (default true). */
  readonly unico?: boolean;
}

/**
 * Eventos disparados AGORA: gatilho atendido e ainda não resolvidos. Função pura
 * — chamada após o tick, com o conjunto de ids já resolvidos do jogador.
 */
export function eventosDisparados(
  estado: EstadoPersonagem,
  defs: readonly EventoDef[],
  resolvidos: ReadonlySet<string>,
): EventoDef[] {
  return defs.filter((e) => !resolvidos.has(e.id) && requisitoAtendido(e.gatilho, estado));
}
