-- Side Quest — schema inicial (F1). Schema public (projeto dedicado ao jogo).
-- RLS por user_id em tudo que é do jogador; conteúdo (zona/missao) é global read.

create table public.personagem (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  level int not null default 1,
  xp bigint not null default 0,
  ouro bigint not null default 0,
  energia numeric not null default 30,
  momentum int not null default 0,
  fortuna int not null default 0,
  mente int not null default 0,
  carreira int not null default 0,
  vigor int not null default 0,
  last_tick timestamptz not null default now(),
  ultimo_checkin_dia date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.zona (
  id int primary key,
  ordem int not null,
  nome text not null,
  descricao text not null,
  requisito text not null,
  icone text not null default '🗺️'
);

create table public.missao (
  id text primary key,
  zona_id int references public.zona(id),
  dominio text not null check (dominio in ('fortuna','mente','carreira','vigor')),
  titulo text not null,
  descricao text,
  tipo text not null check (tipo in ('unica','diaria')),
  xp int not null,
  energia int not null,
  ordem int not null default 0,
  ativa boolean not null default true
);

create table public.checkin (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  missao_id text not null references public.missao(id),
  dia date not null,
  critico boolean not null default false,
  prova text,
  created_at timestamptz not null default now(),
  unique (user_id, missao_id, dia)
);

create table public.evento_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index checkin_user_dia_idx on public.checkin (user_id, dia);
create index evento_log_user_idx on public.evento_log (user_id, created_at desc);

-- RLS
alter table public.personagem enable row level security;
alter table public.zona enable row level security;
alter table public.missao enable row level security;
alter table public.checkin enable row level security;
alter table public.evento_log enable row level security;

create policy personagem_own on public.personagem
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy checkin_own on public.checkin
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy evento_own on public.evento_log
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy zona_read on public.zona for select to authenticated using (true);
create policy missao_read on public.missao for select to authenticated using (true);

-- Seed: Temporada 1 — "Em Busca da Renda Extra"
insert into public.zona (id, ordem, nome, descricao, requisito, icone) values
  (1, 1, 'Vila do Cadastro', 'Toda jornada começa com a papelada. Envie sua candidatura às guildas de IA.', 'inicio', '🏘️'),
  (2, 2, 'Floresta da Espera', 'As caravanas viajam. Enquanto isso, o herói treina corpo e mente.', 'funil_enviado', '🌲'),
  (3, 3, 'Minas do Primeiro Dólar', 'Uma guilda respondeu! Hora de extrair o primeiro minério.', 'primeira_aprovacao', '⛏️'),
  (4, 4, 'Cordilheira da Rotina', 'O verdadeiro chefe é a constância. 4 semanas de ritmo.', 'primeiro_pagamento', '🏔️');

insert into public.missao (id, zona_id, dominio, titulo, descricao, tipo, xp, energia, ordem) values
  -- Zona 1 — o funil (missões únicas)
  ('funil-outlier',  1, 'fortuna', 'Candidatura: Outlier',  'Cadastro + assessment PT-BR (e coding, se oferecido). De manhã, sem pressa.', 'unica', 80, 30, 1),
  ('funil-mindrift', 1, 'fortuna', 'Candidatura: Mindrift', 'Cadastro + teste. Capricho nas justificativas em inglês.', 'unica', 80, 30, 2),
  ('funil-alignerr', 1, 'fortuna', 'Candidatura: Alignerr', 'Cadastro + verificação de identidade + triagem em vídeo.', 'unica', 80, 30, 3),
  ('funil-mercor',   1, 'fortuna', 'Candidatura: Mercor',   'Currículo + entrevista com IA.', 'unica', 80, 30, 4),
  ('funil-payoneer', 1, 'fortuna', 'Tesouraria: Payoneer + PayPal', 'Abrir as contas que recebem USD. 30 minutos.', 'unica', 60, 20, 5),
  -- Diárias — trilhas + hábitos
  ('diaria-bootcamp', null, 'mente',    'Bootcamp Rust: 1 módulo',        'Um módulo = um certificado a mais.', 'diaria', 30, 12, 10),
  ('diaria-codigo',   null, 'mente',    'Sessão de código',                'Modificar algo e fazer rodar.', 'diaria', 30, 12, 11),
  ('diaria-vagas',    null, 'carreira', 'Enviar 2 candidaturas de emprego','LinkedIn/Gupy/Indeed — modo personagem N1.', 'diaria', 25, 10, 12),
  ('diaria-sono',     null, 'vigor',    'Dormir antes da meia-noite',      'Marca de manhã, vale pela noite anterior.', 'diaria', 20, 10, 13),
  ('diaria-leitura',  null, 'vigor',    'Ler Smart But Stuck (10+ min)',   'Com nota no Obsidian = crítico.', 'diaria', 20, 10, 14);
