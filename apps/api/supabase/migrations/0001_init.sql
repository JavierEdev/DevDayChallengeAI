-- Initial schema for persistence in Supabase.
-- This is intentionally minimal for hackathon speed.

create table if not exists public.flows (
  id text primary key,
  name text not null,
  description text null,
  version integer not null default 1,
  definition jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists flows_updated_at_idx on public.flows (updated_at desc);

create table if not exists public.sessions (
  id text primary key,
  flow_id text not null references public.flows(id) on delete restrict,
  status text not null,
  state jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sessions_flow_id_idx on public.sessions (flow_id);
create index if not exists sessions_updated_at_idx on public.sessions (updated_at desc);

create table if not exists public.tool_datasets (
  name text primary key,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tool_records (
  id text primary key,
  dataset_name text not null references public.tool_datasets(name) on delete cascade,
  title text not null,
  content text not null,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tool_records_dataset_name_idx on public.tool_records (dataset_name);

