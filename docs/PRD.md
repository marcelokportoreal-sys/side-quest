# PRD — Side Quest

**Um companheiro de produtividade que vive no canto da tela: a sua vida real molda o destino de um personagem idle.**

> Documento vivo. Versão 1.0 — 2026-07-02. Owner: Marcelo. Horizonte deste PRD: **do MVP pessoal aos primeiros 1.000 usuários.**

---

## 1. Contexto e problema

Apps de produtividade gamificados morrem em ~2 semanas: eles transformam a todo list num RPG, e o usuário logo percebe que só marca checkbox para ganhar XP. O reforço é vazio.

Side Quest inverte a lógica:

> **O idle game é o jogo. A todo list altera o destino do jogo.** As tarefas reais não são XP — são intervenções que mudam os *sistemas* da vida de um personagem que está sempre vivendo no canto da tela.

O gancho não é "ganhei +50 XP", é **"quero ver o que acontece com a vida dele a seguir"**. Isso dá identidade própria e transforma um gamificador de tarefas num **companheiro de produtividade** persistente.

### Por que agora / por que nós
- O F1 já provou o núcleo técnico: engine idle pura e determinística, check-in → energia → produção offline, decaimento suave (sem punição). É base sólida e barata de operar.
- O owner é o usuário-zero real (temporada "renda extra"), o que garante feedback de altíssima fidelidade antes de escalar.

---

## 2. Objetivos e não-objetivos

### Objetivos (deste horizonte — até 1.000 usuários)
1. **Retenção pessoal comprovada:** o owner usa diariamente por ≥ 8 semanas seguidas.
2. **Loop de vida legível:** estágios + eventos de escolha + frase narrativa entregam o "quero ver o que vem depois".
3. **Casca de widget always-on-top** (Tauri) usável no dia a dia — o produto só cumpre a promessa se ficar no canto da tela.
4. **Multi-tenant seguro e barato:** suportar 1.000 contas com custo de infra desprezível e zero vazamento entre usuários (RLS).
5. **Base expansível:** adicionar um sistema/evento/estágio novo = dado + interpretador, não reescrita de engine.

### Não-objetivos (explicitamente fora deste horizonte)
- Monetização / billing / planos pagos.
- Multiplayer, social, rankings, compartilhamento.
- Mobile nativo (iOS/Android).
- Sims completo (casa/casamento/filhos/NPCs envelhecendo simulados em tempo real).
- Combos estilo Balatro em profundidade, empresa/investimentos com telas próprias.
- Marketing de massa. O alvo é **early adopters de produtividade**, recrutados manualmente.

---

## 3. Personas

| Persona | Descrição | Necessidade central |
|---|---|---|
| **Owner (usuário-zero)** | Marcelo, dev, caçando renda extra. Vive no PC o dia todo. | Lembrar/executar tarefas sem fricção; estímulo emocional para continuar. |
| **Early adopter produtividade** | Devs, estudantes, freelancers que já usam idle games / todo apps. | Um companheiro no canto da tela que torne a rotina menos árida. |
| **Curioso de idle games** | Fã de Melvor/Cookie Clicker/TBH. | Progressão viciante com significado real. |

O produto é desenhado **para 1**, e escalado para os **primeiros 1.000 que se parecem com esse 1**.

---

## 4. Métricas de sucesso

### Estrela-guia
**DAU que fazem ≥ 1 check-in real por dia** (não "abriram o app" — *agiram na vida real*).

### Métricas por camada (metas para a fase 0–1.000)

| Camada | Métrica | Meta |
|---|---|---|
| Ativação | % que cria personagem e faz 1º check-in no D0 | ≥ 60% |
| Retenção | D7 / D30 (fez ≥1 check-in) | ≥ 40% / ≥ 20% |
| Engajamento | Check-ins reais / usuário ativo / semana | ≥ 10 |
| Loop de vida | % que resolve ≥1 evento de escolha | ≥ 70% dos D7 |
| Widget | % que instala a casca desktop | ≥ 30% |
| Saúde técnica | p95 de `carregarJogo` | < 400 ms |
| Custo | Infra / mês @ 1.000 usuários | < US$ 25 |

### Instrumentação mínima (ver §8, Fase 3)
`evento_log` já existe como trilha de auditoria por usuário. Evoluir para um **funil analítico** (check-in, level-up, transição de estágio, evento resolvido, offline-gain visto) — sem PII, agregável.

---

## 5. Escopo do produto

### 5.1 Já entregue (F1 + F2)
- **F1:** engine idle pura (`tick`), check-in com prova/crítico, energia, momentum com decaimento suave, produção offline, cena pixel-art em 6 tiers, auth Supabase + RLS.
- **F2:** estágios de vida (salto discreto de produção), eventos de escolha (dado + interpretador de efeitos), frase narrativa diária, sub-estado plugável (`sistemas jsonb`), rota `/widget`.

### 5.2 Pilares funcionais do horizonte

**P1 — Loop de vida (core).**
Check-in real → energia/atributo/momentum → produção offline → cruzar limiar dispara estágio/evento → escolha muda regras → frase narrativa fecha o ciclo.

**P2 — Widget always-on-top (Tauri).**
Casca desktop fina embrulhando `/widget`: janela sem borda, arrastável, no canto, sempre visível. É o que torna o produto um *companheiro*, não um site.

**P3 — Conteúdo como dado.**
Missões, estágios, eventos vivem em tabelas + interpretadores puros. Adicionar conteúdo é migration/seed, não deploy de lógica.

**P4 — Multi-usuário seguro.**
RLS por `user_id` em tudo do jogador; conteúdo global read-only. Onboarding self-service.

**P5 — Observabilidade & operação.**
Logs de erro, funil de eventos, alertas básicos, backups. Necessário antes de convidar estranhos.

---

## 6. Arquitetura técnica e decisões de CTO

### 6.1 Princípios inegociáveis (herdados do design)
1. **Engine pura e determinística.** `(estado, entrada) → resultado`, sem I/O, testável sem mock. É o ativo mais valioso — todo sistema novo é uma função pura reduzida sobre o estado.
2. **Tick-on-read, sem cron.** Produção offline calculada por Δt na leitura. Escala para N usuários sem nenhum job agendado — custo O(acessos), não O(usuários·tempo).
3. **Mundo vivo (futuro) = função pura de tempo + seed.** Mercado/NPCs nunca serão estado mutável rodando em background; serão `f(tempo_global, seed)`. Zero cron, reproduzível, testável.
4. **Aleatoriedade seedada.** Nunca `Math.random()`; PRNG derivado de `(userId, dia, contador)`. Determinismo preservado mesmo com "surpresa".
5. **Conteúdo é dado, lógica é interpretador.** Não escrever `if` por evento.

### 6.2 Por que a espinha atual escala para 1.000 (e muito além)
- **Sem cron** = o gargalo é só o Postgres do Supabase, que aguenta 1.000 usuários folgado no plano gratuito/Pro.
- **Engine roda no request** (Next server / API routes), stateless e horizontalmente escalável na Vercel.
- **RLS no banco** = isolamento de tenant garantido na camada de dados, não na aplicação (menos superfície de bug de vazamento).

### 6.3 Onde a arquitetura precisa evoluir (dívida consciente, faseada)
Hoje o estado é **monolítico e nominal** (`fortuna`, `mente`… são colunas fixas; `Dominio` é union fechado). Cada sistema novo hoje = editar tipo + schema + service (O(sistemas) de custo no core). Isso é aceitável até ~5 sistemas. **Antes de virar colcha de retalhos**, migrar para **motor de sistemas orientado a dados** (ECS-light):

- `EstadoPersonagem = { core, sistemas: Record<string, SubEstado> }` — o `sistemas jsonb` já é a semente.
- `src/domain/systems/*.ts`: cada sistema é um módulo `{ id, tick(ctx), aplicarEvento(ctx, ev) }` puro e testável isolado.
- `engine.ts` vira **orquestrador**: reduz o tick sobre os sistemas *desbloqueados*.
- Desbloqueio progressivo via `avaliarDesbloqueios(estado, defs)` — dado, não código.

**Gatilho de migração:** quando o 4º sistema entrar (ex.: saúde, reputação, negócio, investimento) OU quando adicionar um sistema custar > 1 dia. Até lá, o híbrido faseado (dado só onde o hook precisa) é a decisão certa.

### 6.4 Camada de entrega (widget)
Web (Next.js) **não** sustenta always-on-top fora do browser. Decisão: **Next.js permanece o "servidor de verdade"** (Supabase + domain + API); a casca **Tauri** (Rust, bundle ~10x menor que Electron, sem Node exposto) widgetiza `/widget`. O domain é agnóstico à casca — se a casca mudar, o jogo não muda.

### 6.5 Stack e topologia (1.000 usuários)
```
[Tauri widget] ─┐
[Browser]      ─┼─→ [Next.js na Vercel] ─→ [Supabase: Auth + Postgres(RLS) + Storage]
[Browser mobile]┘        (SSR + API routes,        (provas/screenshots opcionais)
                          engine pura no request)
```
- **Vercel Hobby/Pro** — SSR + API, auto-scaling, sem servidor para manter.
- **Supabase Free→Pro** — Auth, Postgres com RLS, Storage para provas. Migrations versionadas (`supabase/migrations`).
- **Sem Redis/fila/worker** neste horizonte. Introduzir só quando houver função que *precise* rodar sem um usuário presente (não há, por design).

---

## 7. Modelo de dados

### 7.1 Estado atual (migrations 0001 + 0002)
- `personagem` (core + atributos + `sistemas jsonb`) — RLS own.
- `zona`, `missao`, `estagio_def`, `evento_def` — conteúdo global, read-only autenticado.
- `checkin` (unique `user_id,missao_id,dia`), `evento_resolvido` (unique `user_id,evento_id`), `evento_log` — RLS own.

### 7.2 Evolução planejada (padrão, não DDL final)
- **Analítica:** `evento_log` já serve; adicionar `tipo`s padronizados + view agregada (sem PII).
- **Sistemas plugáveis (quando §6.3 disparar):** tabelas `sistema_def` (conteúdo) + `sistema_desbloqueado (user_id, sistema_id)` (progresso, RLS own). Sub-estados continuam em `personagem.sistemas` até justificar tabela dedicada.
- **Provas em Storage:** bucket privado por `user_id`; hoje `checkin.prova` é texto — evoluir para referência de arquivo opcional.
- **Índices:** já há `checkin_user_dia_idx`, `evento_log_user_idx`, `evento_resolvido_user_idx`. Revisar quando queries de funil entrarem.

### 7.3 Regras de migração (disciplina de CTO)
- Toda mudança de schema = nova migration versionada, **idempotente onde possível** (`if not exists`), com seed separado de DDL quando o seed for grande.
- Nunca editar migration já aplicada em produção; sempre uma nova.
- `estagio_def`/`evento_def` são o **espelho em banco** das defs em código — manter os dois em sincronia é responsabilidade de quem adiciona conteúdo (checklist no PR).

---

## 8. Passos de implementação (roadmap faseado)

Cada fase tem **critério de saída** (Definition of Done) e **gate de decisão**. Não avançar sem o DoD.

### Fase 0 — Consolidação do F2 (feito / em fechamento)
**Objetivo:** o loop de vida roda ponta a ponta.
- [x] Módulos puros `estagios`, `eventos`, `efeitos`, `narrativa` + testes.
- [x] Integração `game.service`, `/api/evento`, UI (frase + card de escolha), rota `/widget`.
- [x] Migration `0002_vida.sql`.
- [ ] **Aplicar `0002` no banco** e rodar `scripts/smoke.mts` (E2E real).
- [ ] Rodar `npm run dev` e validar o loop manual (check-in → limiar → evento → escolha → frase).
**DoD:** smoke verde no banco real; loop validado à mão pelo owner.

### Fase 1 — Widget desktop (Tauri) usável
**Objetivo:** o companheiro vive no canto da tela do owner.
- Instalar toolchain Rust (`rustup`) + `@tauri-apps/cli`.
- `tauri init` apontando dev para `/widget` (ver `docs/widget-tauri.md`).
- Janela sem borda, always-on-top, arrastável (`data-tauri-drag-region` já no `Widget.tsx`).
- Plugin `window-state` (persistir posição/tamanho).
- Sessão Supabase reconhecida na casca.
- **Build de instalador** (`tauri build`) para o owner rodar no boot do Windows.
**DoD:** owner usa o widget no dia a dia por ≥ 1 semana sem abrir o browser para jogar.
**Gate:** se o owner não mantém aberto → o problema é de *valor do loop*, não de casca. Voltar à Fase 0.

### Fase 2 — Retenção pessoal & profundidade mínima de conteúdo
**Objetivo:** o owner *quer* voltar; o loop tem surpresa suficiente.
- **3–5 eventos de marco** ligados a conquistas reais da temporada (candidaturas → oferta; estudo → certificação; etc.).
- **1 evento de escolha recorrente** com componente seedado (investir vs. guardar com resultado variável determinístico).
- Refinar a **frase narrativa** para refletir metas ("faltam 2 candidaturas pra fechar o mês").
- Ajuste de balanceamento (curvas de energia/estágio) com base no uso real.
**DoD:** owner com streak funcional de ≥ 4 semanas; ≥ 10 check-ins/semana.
**Gate de escala:** só convidar estranhos **depois** deste DoD. Retenção de 1 antes de retenção de 1.000.

### Fase 3 — Prontidão para multiusuário (pré-1.000)
**Objetivo:** convidar estranhos com segurança e visibilidade.
- **Onboarding self-service** robusto (criação de conta → personagem → primeiro check-in guiado).
- **Observabilidade:** captura de erros (Sentry ou equivalente), funil de eventos via `evento_log`, dashboard simples de DAU/retenção.
- **Segurança/privacidade:** revisão de RLS (testes automatizados de isolamento entre 2 usuários), política de dados/LGPD mínima, bucket de provas privado.
- **Backups & recuperação:** confirmar PITR/backup do Supabase; runbook de restore.
- **Rate limiting** básico nas rotas de API (anti-abuso).
- **Feature flags** simples (env/tabela) para liberar conteúdo sem deploy.
**DoD:** 2 contas de teste 100% isoladas (teste automatizado); erro em produção gera alerta; restore testado uma vez.

### Fase 4 — Primeiros 1.000 (crescimento controlado)
**Objetivo:** crescer sem quebrar retenção nem orçamento.
- **Convites em coortes** (10 → 50 → 200 → 1.000), medindo D7/D30 a cada coorte.
- **Loop de feedback:** canal direto (Discord/form) + análise do funil por coorte.
- **Iteração de conteúdo** guiada por dados (quais eventos engajam, onde o funil vaza).
- **Watch de custo/performance:** p95 de `carregarJogo`, uso de banco, egress. Otimizar query/índice só quando medição pedir.
- **Gate para migração ECS (§6.3):** disparar quando conteúdo/sistemas começarem a custar caro.
**DoD:** 1.000 contas, D30 ≥ 20%, infra < US$ 25/mês, p95 < 400 ms.

### Backlog pós-1.000 (fora do horizonte, registrado para continuidade)
Motor de sistemas plugáveis completo; combos de hábitos (Balatro); empresa/investimentos com telas próprias; mundo vivo (mercado como `f(tempo, seed)`); mobile; monetização.

---

## 9. Riscos e mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| Loop vira "só clicar checkbox" e descola da vida | Fatal (mata a tese) | Check-in exige *especificidade* (nomear ação); prova é upside; frase narrativa ancora significado. |
| Excesso de sistemas paralelos → progresso ilegível | Alto (churn) | Tudo se resolve de volta em ouro/XP/energia/estágio visíveis. Um único "medidor de vida". Sem tela paralela de gerência. |
| Aversão à perda (streak quebrada) → evitação | Alto | Decaimento suave já implementado; **nunca zerar**. Não adicionar punição. |
| Colcha de retalhos no core (dívida de §6.3) | Médio | Gate explícito de migração ECS no 4º sistema. |
| Toolchain Tauri/Rust trava | Médio | Frente A entrega valor sem a casca; `/widget` já roda no browser. |
| Custo Supabase/Vercel escala mal | Baixo (neste horizonte) | Sem cron, RLS no banco, watch de p95/egress; plano Pro só se medição pedir. |
| Vazamento entre tenants (RLS mal configurado) | Fatal (confiança) | Teste automatizado de isolamento entre 2 usuários no CI (Fase 3). |
| Owner é o único validador (viés) | Médio | Convites em coortes pequenas cedo, com feedback estruturado. |

---

## 10. Custo e operação (1.000 usuários)

- **Vercel:** Hobby cobre o MVP; Pro (~US$20/mês) se precisar de mais build/analytics. Sem servidor gerenciado.
- **Supabase:** Free → Pro (~US$25/mês) quando passar de limites de banco/storage/MAU. 1.000 MAU cabe folgado.
- **Sem infra adicional** (sem Redis/fila/worker) por design (tick-on-read).
- **Estimativa realista @ 1.000:** **< US$ 25/mês**, dominado por Supabase Pro se/quando necessário.
- **Operação:** deploy contínuo (push na `main` = deploy Vercel); migrations versionadas aplicadas manualmente com revisão; runbook de restore; alertas de erro.

---

## 11. Segurança, privacidade e continuidade

- **Isolamento:** RLS por `user_id` em todas as tabelas de jogador; conteúdo global read-only. Teste de isolamento no CI.
- **Auth:** Supabase Auth (e-mail/senha hoje); middleware protege rotas, redireciona não-logado.
- **Dados pessoais:** mínimos (e-mail + nome do personagem + textos de prova). Bucket de provas privado. Política LGPD enxuta antes de convidar estranhos (Fase 3).
- **Segredos:** apenas `NEXT_PUBLIC_*` no cliente (anon key + URL); nunca service_role no front.
- **Continuidade de código:** engine pura + testes = base auditável; migrations versionadas = schema reproduzível; este PRD + memória do projeto = decisões rastreáveis; `docs/widget-tauri.md` = casca reproduzível.
- **Bus factor:** documentação (README, PRD, docs) mantém o projeto retomável por outro dev sem contexto tribal.

---

## 12. Definição de pronto (resumo executivo dos gates)

1. **F2 fechado:** smoke verde + loop manual validado.
2. **Widget:** owner usa no canto da tela ≥ 1 semana.
3. **Retenção de 1:** owner com ≥ 4 semanas de streak antes de qualquer convite.
4. **Prontidão multiusuário:** isolamento testado, observabilidade e backup em pé.
5. **1.000:** crescimento em coortes com D30 ≥ 20% e custo < US$ 25/mês.

> **Princípio-guia do CTO:** provar retenção de **um** antes de escalar para **mil**; manter a engine pura e sem cron como o eixo que torna 1.000 (e 100.000) uma questão de custo linear, não de reescrita.
