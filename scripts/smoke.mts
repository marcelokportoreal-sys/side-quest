/**
 * Smoke E2E contra o banco REAL (auth + RLS + seed + engine):
 * cria usuário efêmero → personagem → carrega jogo → check-in → valida números
 * → check-in duplicado deve falhar → apaga nada (usuário smoke fica; sem dados sensíveis).
 * Uso: npx tsx scripts/smoke.mts
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { carregarJogo, criarPersonagem, fazerCheckin, resolverEvento, criarTarefa, fazerCheckinTarefa } from "../src/domain/game.service";

function envLocal(nome: string): string {
  const conteudo = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const linha = conteudo.split("\n").find((l) => l.startsWith(`${nome}=`));
  if (!linha) throw new Error(`env ausente: ${nome}`);
  return linha.slice(nome.length + 1).trim();
}

const url = envLocal("NEXT_PUBLIC_SUPABASE_URL");
const anon = envLocal("NEXT_PUBLIC_SUPABASE_ANON_KEY");

function ok(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`FALHOU: ${msg}`);
  console.log(`  ✓ ${msg}`);
}

const db = createClient(url, anon);
const email = `smoke+${Date.now()}@sidequest.local`;

console.log("1. signup (autoconfirm)…");
const { data: su, error: es } = await db.auth.signUp({ email, password: "smoke-Segura-123" });
if (es || !su.user) throw new Error(`signup: ${es?.message}`);
ok(!!su.session, "sessão criada sem confirmação de e-mail");

console.log("2. personagem…");
await criarPersonagem(db, su.user.id, "Smoke Hero");

console.log("3. carregar jogo…");
const jogo = await carregarJogo(db, su.user.id);
if (!jogo) throw new Error("jogo não carregou");
ok(jogo.level === 1 && jogo.energia === 30, `estado inicial (lv1, ⚡30) — veio lv${jogo.level} ⚡${jogo.energia}`);
ok(jogo.missoes.length === 10, `10 missões seedadas — vieram ${jogo.missoes.length}`);
ok(jogo.missoes.filter((m) => m.tipo === "unica").length === 5, "5 missões do funil (únicas)");

console.log("4. check-in (Outlier, com prova → crítico)…");
const r = await fazerCheckin(db, su.user.id, "funil-outlier", "assessment enviado hoje de manhã");
ok(r.critico, "prova ≥10 chars vira crítico");
ok(r.xpGanho === 120, `xp 80×1.5=120 — veio ${r.xpGanho}`);
ok(r.levelsGanhos === 1, "level up no primeiro check-in (120 ≥ 100)");
ok(r.momentum === 1, "momentum subiu para 1");
ok(r.energia > 30, `energia subiu — ${r.energia}`);

console.log("5. duplicata deve ser bloqueada…");
let bloqueou = false;
try {
  await fazerCheckin(db, su.user.id, "funil-outlier", null);
} catch {
  bloqueou = true;
}
ok(bloqueou, "check-in duplicado de missão única rejeitado");

console.log("6. visão pós-checkin…");
const jogo2 = await carregarJogo(db, su.user.id);
ok(jogo2!.missoes.find((m) => m.id === "funil-outlier")!.concluida, "missão marcada concluída");
ok(jogo2!.level === 2, `level 2 — veio ${jogo2!.level}`);
ok(jogo2!.estagio.nome === "Maltrapilho", `estágio inicial Maltrapilho — veio ${jogo2!.estagio.nome}`);
ok(typeof jogo2!.frase === "string" && jogo2!.frase.length > 0, "frase narrativa gerada");

console.log("7. resolver evento de escolha (primeiro-emprego → aceitar)…");
const ouroAntes = jogo2!.ouro;
const re = await resolverEvento(db, su.user.id, "primeiro-emprego", "aceitar");
ok(re.ouro === ouroAntes + 300, `efeito de ouro aplicado (+300) — ${ouroAntes} → ${re.ouro}`);

console.log("8. evento único não pode ser resolvido duas vezes…");
let bloqueouEvento = false;
try {
  await resolverEvento(db, su.user.id, "primeiro-emprego", "aceitar");
} catch {
  bloqueouEvento = true;
}
ok(bloqueouEvento, "evento já resolvido rejeitado");

console.log("9. todo list do usuário: criar tarefa + check-in…");
const tarefa = await criarTarefa(db, su.user.id, {
  titulo: "Enviar 3 candidaturas", descricao: null, dominio: "carreira", tipo: "diaria", dificuldade: "media",
});
ok(tarefa.xp === 35 && tarefa.energia === 16, `recompensa vem do preset (média=35xp/16⚡) — veio ${tarefa.xp}xp/${tarefa.energia}⚡`);
const jogo3 = await carregarJogo(db, su.user.id);
ok((jogo3!.tarefas ?? []).some((t) => t.id === tarefa.id && !t.concluida), "tarefa aparece pendente na visão");
const rt = await fazerCheckinTarefa(db, su.user.id, tarefa.id, null);
ok(rt.xpGanho === 35, `check-in de tarefa credita 35 xp — veio ${rt.xpGanho}`);
const jogo4 = await carregarJogo(db, su.user.id);
ok(jogo4!.tarefas.find((t) => t.id === tarefa.id)!.concluida, "tarefa marcada concluída hoje");

console.log("10. tarefa diária não pode repetir no mesmo dia…");
let bloqueouTarefa = false;
try { await fazerCheckinTarefa(db, su.user.id, tarefa.id, null); } catch { bloqueouTarefa = true; }
ok(bloqueouTarefa, "check-in duplicado de tarefa diária rejeitado");

console.log("\nSMOKE OK — auth, RLS, seed, engine, estágios, eventos, todo-list do usuário e persistência funcionando no banco real.");
