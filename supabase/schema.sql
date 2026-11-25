-- =====================================================================
-- TaskFlow - Schema multi-tenant para Supabase (PostgreSQL)
-- Execute no SQL Editor do Supabase.
--
-- Ideia central: toda tabela de negócio carrega organization_id e as
-- políticas RLS (Row Level Security) garantem que um usuário só enxerga
-- dados das organizações das quais é membro.
-- =====================================================================

-- ---------- Tipos ----------
create type plan_type as enum ('free', 'pro');
create type member_role as enum ('admin', 'member');
create type task_status as enum ('todo', 'doing', 'done');

-- ---------- Tabelas ----------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan plan_type not null default 'free',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table memberships (
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role member_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  status task_status not null default 'todo',
  assignee_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Nome de organização único no sistema, sem diferenciar maiúsculas/minúsculas.
create unique index organizations_name_unique on organizations (lower(name));

create index on memberships (user_id);
create index on projects (organization_id);
create index on tasks (organization_id);
create index on tasks (project_id);

-- ---------- Funções auxiliares ----------
-- Retorna true se o usuário logado pertence à organização.
-- security definer evita recursão de RLS ao consultar memberships.
create or replace function is_member(org uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from memberships
    where organization_id = org and user_id = auth.uid()
  );
$$;

create or replace function is_admin(org uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from memberships
    where organization_id = org and user_id = auth.uid() and role = 'admin'
  );
$$;

-- ---------- Limite do plano Free ----------
-- Regra de negócio aplicada no banco: Free pode ter no máximo 2 projetos.
create or replace function enforce_project_limit()
returns trigger
language plpgsql
as $$
declare
  org_plan plan_type;
  project_count int;
begin
  select plan into org_plan from organizations where id = new.organization_id;
  select count(*) into project_count from projects where organization_id = new.organization_id;

  if org_plan = 'free' and project_count >= 2 then
    raise exception 'Limite do plano Free atingido (2 projetos). Faça upgrade para o Pro.';
  end if;

  return new;
end;
$$;

create trigger projects_limit
before insert on projects
for each row execute function enforce_project_limit();

-- ---------- Criar perfil automaticamente no cadastro ----------
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();

-- ---------- Criar organização + tornar o criador admin ----------
create or replace function create_organization(org_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org uuid;
begin
  insert into organizations (name, created_by)
  values (org_name, auth.uid())
  returning id into new_org;

  insert into memberships (organization_id, user_id, role)
  values (new_org, auth.uid(), 'admin');

  return new_org;
end;
$$;

-- ---------- Row Level Security ----------
alter table profiles enable row level security;
alter table organizations enable row level security;
alter table memberships enable row level security;
alter table projects enable row level security;
alter table tasks enable row level security;

-- profiles: cada um vê e edita o próprio; membros da mesma org se enxergam
create policy "profiles_select" on profiles for select
  using (
    id = auth.uid()
    or exists (
      select 1 from memberships m1
      join memberships m2 on m1.organization_id = m2.organization_id
      where m1.user_id = auth.uid() and m2.user_id = profiles.id
    )
  );
create policy "profiles_update_own" on profiles for update
  using (id = auth.uid());

-- organizations: membros leem; só admin altera (ex.: upgrade de plano)
create policy "orgs_select" on organizations for select
  using (is_member(id));
create policy "orgs_update_admin" on organizations for update
  using (is_admin(id));

-- memberships: membros veem a equipe; só admin gerencia
create policy "memberships_select" on memberships for select
  using (is_member(organization_id));
create policy "memberships_insert_admin" on memberships for insert
  with check (is_admin(organization_id));
create policy "memberships_delete_admin" on memberships for delete
  using (is_admin(organization_id));

-- projects: qualquer membro lê/cria/edita; só admin apaga
create policy "projects_select" on projects for select
  using (is_member(organization_id));
create policy "projects_insert" on projects for insert
  with check (is_member(organization_id));
create policy "projects_update" on projects for update
  using (is_member(organization_id));
create policy "projects_delete_admin" on projects for delete
  using (is_admin(organization_id));

-- tasks: qualquer membro faz tudo dentro da própria organização
create policy "tasks_select" on tasks for select
  using (is_member(organization_id));
create policy "tasks_insert" on tasks for insert
  with check (is_member(organization_id));
create policy "tasks_update" on tasks for update
  using (is_member(organization_id));
create policy "tasks_delete" on tasks for delete
  using (is_member(organization_id));

-- ---------- Permissões da Data API ----------
-- Desde 2026, tabelas novas em public não são expostas automaticamente à API.
-- O RLS acima continua decidindo QUAIS linhas cada usuário enxerga.
grant select, insert, update, delete
on public.profiles, public.organizations, public.memberships, public.projects, public.tasks
to authenticated;
