# @devday/api

Backend for the hackathon using layered architecture:

- `Domain`: contracts/interfaces.
- `Application`: use cases.
- `Infrastructure`: adapters for LLM and persistence.
- `HTTP`: endpoint exposure with Fastify.

## Run

1. Copy `.env.example` to `.env`.
2. Set `GOOGLE_API_KEY` (or `GEMINI_API_KEY`).
3. Optional: configure Supabase env vars if using DB persistence.
4. From repo root run:
   - `npm run dev --workspace @devday/api`

## Persistence mode

- `PERSISTENCE_DRIVER=memory` (default): in-memory repositories.
- `PERSISTENCE_DRIVER=supabase`: uses Supabase repositories for flows, sessions and tool datasets.

Required for Supabase:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Supabase SQL

- Migration: `supabase/migrations/0001_init.sql`
- Vector migration: `supabase/migrations/0002_vectorize_tool_records.sql`
- Gemini Embedding 1 migration (storage at 768 dims + ivfflat index): `supabase/migrations/0003_upgrade_embeddings_to_gemini_embedding_001.sql`
- Optional seed: `supabase/seeds/0001_seed_tool_data.sql`
- JSON seed script (uses `faq.json`, `autos.json`, `dates.json` from repo root):
  - `npm run seed:supabase:tools --workspace @devday/api`
- Embedding backfill script (does not replace seed; only fills missing vectors):
  - `npm run backfill:supabase:embeddings --workspace @devday/api`
  - Uses `gemini-embedding-001` and supports projection to `768`, `1536` or `3072` dims via `TOOL_EMBEDDING_DIMENSIONS` (default `768`).

When using `PERSISTENCE_DRIVER=supabase`, the `tool` node now attempts semantic retrieval via `match_tool_records` and falls back to full dataset load if semantic search fails or returns no matches.

## Endpoints

- `POST /v1/flows`
- `GET /v1/flows/:flowId`
- `PUT /v1/flows/:flowId`
- `DELETE /v1/flows/:flowId`
- `POST /v1/flows/validate`
- `POST /v1/sessions`
- `POST /v1/chat/sessions/:sessionId/messages`

## Swagger

- UI: `GET /docs`
- OpenAPI JSON: `GET /docs/json`
