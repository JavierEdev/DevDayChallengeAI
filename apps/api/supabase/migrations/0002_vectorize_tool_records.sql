-- Vectorization support for tool records using pgvector.
-- Incremental migration: does not modify existing seed logic.

create extension if not exists vector;

alter table public.tool_records
add column if not exists embedding vector(768);

-- Similarity search helper for RAG-style retrieval.
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
