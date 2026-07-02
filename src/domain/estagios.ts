/**
 * Estágios de vida — a releitura narrativa do progresso.
 *
 * Em vez de "level sobe → número maior", o personagem MUDA DE VIDA ao cruzar
 * requisitos: cada estágio dá um SALTO DISCRETO na produção (multOuro/multXp),
 * não uma curva contínua. Isso é o "tarefas mudam sistemas, não só números":
 * o requisito pode ser nível OU um atributo cruzando um limiar.
 *
 * Conteúdo como DADO: adicionar um estágio = editar este array (+ o seed da
 * migration que o espelha para consultas/UI). A engine continua pura.
 */

import { type EstadoPersonagem, type Dominio } from "./engine";

/** Requisito declarativo de um estágio (avaliado por função pura). */
export interface RequisitoEstagio {
  /** Nível mínimo do personagem. */
  readonly nivelMin?: number;
  /** Atributo que precisa cruzar um limiar. */
  readonly atributo?: Dominio;
  /** Valor mínimo do atributo acima. */
  readonly min?: number;
}

export interface EstagioDef {
  readonly ordem: number;
  readonly nome: string;
  readonly sub: string;
  /** Índice do estágio VISUAL correspondente (0..5) em GameScene. */
  readonly indiceVisual: number;
  /** Multiplicador de produção de ouro deste estágio (salto discreto). */
  readonly multOuro: number;
  /** Multiplicador de produção de xp deste estágio. */
  readonly multXp: number;
  readonly requisito: RequisitoEstagio;
}

/**
 * 6 estágios canônicos — casam 1:1 com os TIERS visuais (levelMin da referência),
 * agora com salto de produção por estágio. O requisito primário é o nível (mantém
 * o comportamento visual atual), mas o tipo suporta gates por atributo para
 * eventos/estágios futuros ("carreira >= 10" etc.).
 */
export const ESTAGIOS: readonly EstagioDef[] = [
  { ordem: 0, nome: "Maltrapilho",  sub: "o nada",             indiceVisual: 0, multOuro: 1.0, multXp: 1.0, requisito: { nivelMin: 1 } },
  { ordem: 1, nome: "Sobrevivente", sub: "primeiros passos",   indiceVisual: 1, multOuro: 1.4, multXp: 1.2, requisito: { nivelMin: 4 } },
  { ordem: 2, nome: "Rapaz Comum",  sub: "uma vida decente",   indiceVisual: 2, multOuro: 2.0, multXp: 1.5, requisito: { nivelMin: 8 } },
  { ordem: 3, nome: "Bem Sucedido", sub: "prosperidade",       indiceVisual: 3, multOuro: 3.0, multXp: 1.8, requisito: { nivelMin: 12 } },
  { ordem: 4, nome: "Podre de Rico", sub: "excesso e poder",   indiceVisual: 4, multOuro: 4.5, multXp: 2.2, requisito: { nivelMin: 17 } },
  { ordem: 5, nome: "Dono do Mundo", sub: "o topo",            indiceVisual: 5, multOuro: 6.0, multXp: 2.6, requisito: { nivelMin: 23 } },
];

/** Avalia um requisito declarativo contra o estado — função pura. */
export function requisitoAtendido(req: RequisitoEstagio, estado: EstadoPersonagem): boolean {
  if (req.nivelMin != null && estado.level < req.nivelMin) return false;
  if (req.atributo != null && (estado.atributos[req.atributo] ?? 0) < (req.min ?? 0)) return false;
  return true;
}

/**
 * Estágio atual = o de MAIOR ordem cujo requisito é atendido. Como os requisitos
 * são cumulativos por nível, sempre há pelo menos o estágio 0.
 */
export function estagioAtual(estado: EstadoPersonagem, defs: readonly EstagioDef[] = ESTAGIOS): EstagioDef {
  let atual = defs[0]!;
  for (const d of defs) {
    if (requisitoAtendido(d.requisito, estado) && d.ordem > atual.ordem) atual = d;
  }
  return atual;
}
