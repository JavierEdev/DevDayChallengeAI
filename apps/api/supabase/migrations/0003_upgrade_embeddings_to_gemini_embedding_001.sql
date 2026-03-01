-- Keep storage at 768 dims while using gemini-embedding-001.
-- We leverage MRL prefix projection (first N dims) from Gemini embeddings.

drop index if exists public.tool_records_embedding_ivfflat_idx;

drop function if exists public.match_tool_records(vector(768), integer, text);
drop function if exists public.match_tool_records(vector(3072), integer, text);

-- Clear previous embeddings and regenerate with gemini-embedding-001.
update public.tool_records
set embedding = null
where embedding is not null;

alter table public.tool_records
alter column embedding type vector(768)
using embedding::vector(768);

create or replace function public.match_tool_records(
  query_embedding vector(768),
  match_count integer default 5,
  dataset_filter text default null
)
returns table (
  id text,
  dataset_name text,
  title text,
  content text,
  tags text[],
  similarity real
)
language sql
stable
as $$
  select
    tr.id,
    tr.dataset_name,
    tr.title,
    tr.content,
    tr.tags,
    (1 - (tr.embedding <=> query_embedding))::real as similarity
  from public.tool_records tr
  where tr.embedding is not null
    and (dataset_filter is null or tr.dataset_name = dataset_filter)
  order by tr.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

create index if not exists tool_records_embedding_ivfflat_idx
  on public.tool_records
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);
