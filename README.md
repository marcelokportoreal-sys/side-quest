# ⚔️ Side Quest

**Temporada 1 — Em Busca da Renda Extra.** Um idle RPG onde o herói grinda sozinho,
mas **só produz com Energia — e Energia só vem de ações reais** (check-ins de missões
da vida: candidaturas, estudo, hábitos). Sem punição por dia vazio: sem energia o
herói descansa; o momentum decai 1 passo, nunca zera.

## Loop
Ação real → check-in (prova opcional = crítico +50%) → Energia + XP na hora →
o herói produz ouro/XP offline → "enquanto você estava fora…" → marcos reais
desbloqueiam zonas e chefes.

## Stack
Next.js 16 + React 19 + TS estrito · Supabase (auth + Postgres + RLS) · framer-motion ·
engine idle **puro** em `src/domain/engine.ts` (determinístico, testado; tick por Δt
na leitura — sem cron).

## Para Rodar
```bash
npm install
cp .env.local.example .env.local   # preencher URL + anon key do Supabase
npm run test        # engine (13 testes)
npm run typecheck
npm run dev
npx tsx scripts/smoke.mts   # E2E contra o banco real (cria e usa usuário efêmero)
```

## Deploy (Vercel)
Import do repo GitHub → framework Next.js (auto) → env vars:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Push na `main` = deploy.

## Estrutura
```
src/domain/    engine.ts (puro, tick) · estagios.ts · eventos.ts · efeitos.ts ·
               narrativa.ts · game.service.ts (orquestra + Supabase)
src/app/       jogo (/) + /widget (casca enxuta) + /api/checkin · /api/evento · /api/personagem
src/components Dashboard + Widget + Onboarding + pixel/GameScene
supabase/      0001_init (schema + seed T1) · 0002_vida (estágios, eventos, sub-estado)
docs/          widget-tauri.md (casca desktop always-on-top)
```

## A vida molda o destino (F2)
A todo list não dá "XP" — ela **muda os sistemas da vida**. Os atributos viram stats
que, ao cruzarem limiares, disparam **estágios de vida** (saltos discretos de produção:
Maltrapilho → … → Dono do Mundo) e **eventos de escolha** (aceitar um emprego, investir
vs. guardar) que alteram as regras dali em diante. O hook diário é uma **frase narrativa**
do estado, não um painel de números. Tudo permanece puro e determinístico (sem cron;
estágios/eventos são dados + interpretador de efeitos).

## Roadmap
F1 ✅ núcleo jogável · **F2 ✅ vida: estágios + eventos de escolha + frase narrativa +
rota /widget** · Frente B: casca desktop Tauri (`docs/widget-tauri.md`) · F3 combos de
hábitos (Balatro), empresa/investimentos, mundo vivo (mercado como função pura de
tempo+seed) — só se o loop de vida provar retenção.
