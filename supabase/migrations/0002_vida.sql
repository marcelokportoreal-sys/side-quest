-- Side Quest — F2 "A vida molda o destino". Estágios de vida, eventos de escolha
-- e sub-estado plugável. Conteúdo (estagio_def/evento_def) é global read, como
-- zona/missao; progresso do jogador (evento_resolvido) tem RLS por user_id.

-- Sub-estado de vida plugável no personagem (empregoAtual, patrimonio, flags…).
alter table public.personagem
  add column if not exists sistemas jsonb not null default '{}'::jsonb;

-- Estágios de vida (espelha src/domain/estagios.ts para consultas/UI).
create table public.estagio_def (
  ordem int primary key,
  nome text not null,
  sub text not null,
  indice_visual int not null,
  mult_ouro numeric not null default 1,
  mult_xp numeric not null default 1,
  requisito jsonb not null default '{}'::jsonb
);

-- Eventos de escolha: gatilho declarativo + opções com efeitos (dados).
create table public.evento_def (
  id text primary key,
  gatilho jsonb not null,
  titulo text not null,
  texto text not null,
  opcoes jsonb not null,
  unico boolean not null default true,
  ativo boolean not null default true
);

-- Eventos já resolvidos pelo jogador (barra re-disparo de evento único).
create table public.evento_resolvido (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  evento_id text not null references public.evento_def(id),
  opcao_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, evento_id)
);

create index evento_resolvido_user_idx on public.evento_resolvido (user_id);

-- RLS
alter table public.estagio_def enable row level security;
alter table public.evento_def enable row level security;
alter table public.evento_resolvido enable row level security;

create policy estagio_read on public.estagio_def for select to authenticated using (true);
create policy evento_def_read on public.evento_def for select to authenticated using (true);
create policy evento_resolvido_own on public.evento_resolvido
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Seed: estágios (espelho de ESTAGIOS em estagios.ts)
insert into public.estagio_def (ordem, nome, sub, indice_visual, mult_ouro, mult_xp, requisito) values
  (0, 'Maltrapilho',   'o nada',           0, 1.0, 1.0, '{"nivelMin":1}'),
  (1, 'Sobrevivente',  'primeiros passos', 1, 1.4, 1.2, '{"nivelMin":4}'),
  (2, 'Rapaz Comum',   'uma vida decente', 2, 2.0, 1.5, '{"nivelMin":8}'),
  (3, 'Bem Sucedido',  'prosperidade',      3, 3.0, 1.8, '{"nivelMin":12}'),
  (4, 'Podre de Rico', 'excesso e poder',   4, 4.5, 2.2, '{"nivelMin":17}'),
  (5, 'Dono do Mundo', 'o topo',           5, 6.0, 2.6, '{"nivelMin":23}');

-- Seed: eventos de escolha iniciais (Temporada 1)
insert into public.evento_def (id, gatilho, titulo, texto, opcoes) values
  (
    'primeiro-emprego',
    '{"atributo":"carreira","min":5}',
    'Uma guilda respondeu',
    'Depois de tantas candidaturas, chegou uma oferta de contrato fixo. Aceitar troca a renda de freela por um salário estável.',
    '[
      {"id":"aceitar","label":"Aceitar o contrato","efeitos":[{"tipo":"sistema","chave":"empregoAtual","valor":"clt"},{"tipo":"ouro","delta":300}]},
      {"id":"recusar","label":"Seguir como freelancer","efeitos":[{"tipo":"momentum","delta":1}]}
    ]'
  ),
  (
    'primeiro-investimento',
    '{"atributo":"mente","min":8}',
    'Ideia de investimento',
    'A leitura acumulada abriu sua cabeça: dá pra fazer o ouro trabalhar. Investir arrisca o caixa por retorno maior; guardar mantém a segurança.',
    '[
      {"id":"investir","label":"Investir o caixa","efeitos":[{"tipo":"sistema","chave":"investindo","valor":true},{"tipo":"ouro","delta":-200},{"tipo":"atributo","atributo":"fortuna","delta":3}]},
      {"id":"guardar","label":"Guardar por enquanto","efeitos":[{"tipo":"energia","delta":20}]}
    ]'
  ),
  (
    'primeiro-carro',
    '{"nivelMin":8}',
    'Hora de um carro',
    'A vida decente pede mobilidade. Um carro consome ouro agora, mas acelera a rotina e o ânimo.',
    '[
      {"id":"comprar","label":"Comprar o carro","efeitos":[{"tipo":"sistema","chave":"temCarro","valor":true},{"tipo":"ouro","delta":-500},{"tipo":"momentum","delta":2}]},
      {"id":"esperar","label":"Ainda não","efeitos":[]}
    ]'
  );
