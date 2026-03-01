# @devday/api

Backend base for the hackathon using layered architecture:

- `Domain`: contracts/interfaces.
- `Application`: use cases.
- `Infrastructure`: external integrations and in-memory adapters.
- `HTTP`: endpoint exposure with Fastify.

## Folder structure

- `src/domain/agent/IAgentLlmPort.ts`: LLM port contract (`IAgentLlmPort`).
- `src/domain/agent/IAgentProviderFactory.ts`: abstract factory contract (`IAgentProviderFactory`).
- `src/domain/session/ISessionStateStore.ts`: session store contract.
- `src/domain/tool/IToolRepository.ts`: tool repository contract.

- `src/application/session/CreateSessionUseCase.ts`: creates runtime session state.
- `src/application/session/RunConversationTurnUseCase.ts`: handles one chat turn.
- `src/application/flow/ValidateFlowUseCase.ts`: validates flow structure.

- `src/infrastructure/llm/LangChainGeminiLlmAdapter.ts`: Gemini implementation via LangChain.
- `src/infrastructure/llm/GeminiLlmProviderFactory.ts`: concrete provider factory.
- `src/infrastructure/llm/CreateAgentLlmPort.ts`: environment-based provider resolver.
- `src/infrastructure/session/InMemorySessionStateStore.ts`: in-memory session state.
- `src/infrastructure/tool/InMemoryToolRepository.ts`: static JSON-like datasets in memory.

- `src/http/CreateHttpServer.ts`: Fastify app builder.
- `src/http/routes/SessionRoutes.ts`: session endpoints.
- `src/http/routes/FlowRoutes.ts`: flow validation endpoint.
- `src/main.ts`: bootstrap/composition root.

## Endpoints

- `POST /v1/sessions`
  - Body: `CreateSessionRequest` (shared schema)
  - Response: `CreateSessionResponse`

- `POST /v1/sessions/:sessionId/messages`
  - Body: `{ message: string, metadata?: Record<string, unknown> }`
  - Response: `SendMessageResponse`

- `POST /v1/flows/validate`
  - Body: `FlowDefinition`
  - Response: `ValidateFlowResponse`

## Swagger

- UI: `GET /docs`
- OpenAPI JSON: `GET /docs/json`
- Cada endpoint documenta `request` y `response` con los schemas compartidos de `@devday/shared`.

## Run

1. Copy `.env.example` to `.env` and set API key.
2. Run `npm install` at repo root.
3. Run `npm run dev --workspace @devday/api`.
