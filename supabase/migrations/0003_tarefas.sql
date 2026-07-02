-- Side Quest — F2.1 "Todo list de verdade": tarefas criadas pelo usuário.
-- O jogador define as próprias tarefas (título + domínio + tipo + dificuldade);
-- a recompensa (xp/energia) vem de presets de dificuldade (src/domain/tarefa.ts),
-- não de números arbitrários. Check-in generalizado: missão seedada OU tarefa.

create table public.tarefa (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  titulo text not null,
  descricao text,
  dominio text not null check (dominio in ('fortuna','mente','carreira','vigor')),
  tipo text not null check (tipo in ('unica','diaria')),
  dificuldade text not null check (dificuldade in ('trivial','leve','media','desafiadora','epica')),
  xp int not null,
  energia int not null,
  arquivada boolean not null default false,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

create index tarefa_user_idx on public.tarefa (user_id, arquivada, ordem);

alter table public.tarefa enable row level security;
create policy tarefa_own on public.tarefa
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Generaliza o check-in: agora pode referenciar uma missão seedada OU uma tarefa
-- do usuário. Exatamente uma das duas deve estar preenchida.
alter table public.checkin add column if not exists tarefa_id uuid references public.tarefa(id) on delete cascade;
alter table public.checkin alter column missao_id drop not null;
alter table public.checkin add constraint checkin_fonte_unica
  check ((missao_id is not null)::int + (tarefa_id is not null)::int = 1);

-- Dedup de diária por tarefa (o unique de missão continua valendo para missões).
create unique index if not exists checkin_user_tarefa_dia
  on public.checkin (user_id, tarefa_id, dia) where tarefa_id is not null;
