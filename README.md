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

## Rodar
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
src/domain/    engine.ts (puro) + game.service.ts (orquestra + Supabase)
src/app/       páginas (login, jogo) + /api/checkin + /api/personagem
src/components Dashboard (animações de recompensa) + Onboarding
supabase/      migrations versionadas (0001_init: schema + RLS + seed Temporada 1)
```

## Roadmap
F1 ✅ núcleo jogável · F2 loja/equipamento, zonas 2–4, caravanas, feed offline ·
F3 boss fights, mapa da temporada, PWA.
