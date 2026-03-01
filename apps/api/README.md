# @devday/api

Backend for the hackathon using layered architecture:

- `Domain`: contracts/interfaces.
- `Application`: use cases.
- `Infrastructure`: adapters for LLM and persistence.
- `HTTP`: endpoint exposure with Fastify.

## Run

1. Copy `.env.example` to `.env`.
2. Set `GOOGLE_API_KEY` (or `GEMINI_API_KEY`).
3. Optional: increase `AGENT_TIMEOUT_MS` if your model/context needs more than 15s.
4. From repo root run:
   - `npm run dev --workspace @devday/api`

## Runtime mode

- Flows and sessions run in memory.
- Tool datasets (RAG) load from local JSON files: `faq.json`, `autos.json`, `dates.json`.
- You can override JSON paths with env vars:
  - `FAQ_JSON_PATH`
  - `AUTOS_JSON_PATH`
  - `DATES_JSON_PATH`

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
