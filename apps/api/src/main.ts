import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

import { createHttpServer } from "./http/CreateHttpServer.js";
import { CreateFlowUseCase } from "./application/flow/CreateFlowUseCase.js";
import { DeleteFlowUseCase } from "./application/flow/DeleteFlowUseCase.js";
import { GetFlowUseCase } from "./application/flow/GetFlowUseCase.js";
import { UpdateFlowUseCase } from "./application/flow/UpdateFlowUseCase.js";
import { RunConversationTurnUseCase } from "./application/chat/RunConversationTurnUseCase.js";
import { CreateSessionUseCase } from "./application/session/CreateSessionUseCase.js";
import { ValidateFlowUseCase } from "./application/flow/ValidateFlowUseCase.js";
import type { IFlowRepository } from "./domain/flow/IFlowRepository.js";
import type { ISessionStateStore } from "./domain/session/ISessionStateStore.js";
import type { IToolRepository } from "./domain/tool/IToolRepository.js";
import { createAgentLlmPortFromEnv } from "./infrastructure/llm/CreateAgentLlmPort.js";
import { InMemoryFlowRepository } from "./infrastructure/flow/InMemoryFlowRepository.js";
import { SupabaseFlowRepository } from "./infrastructure/flow/SupabaseFlowRepository.js";
import { InMemorySessionStateStore } from "./infrastructure/session/InMemorySessionStateStore.js";
import { SupabaseSessionStateStore } from "./infrastructure/session/SupabaseSessionStateStore.js";
import { InMemoryToolRepository } from "./infrastructure/tool/InMemoryToolRepository.js";
import { SupabaseToolRepository } from "./infrastructure/tool/SupabaseToolRepository.js";
import { createSupabaseClientFromEnv } from "./infrastructure/supabase/CreateSupabaseClient.js";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectoryPath = dirname(currentFilePath);
dotenv.config({ path: resolve(currentDirectoryPath, "../.env") });

type PersistenceDriver = "memory" | "supabase";

async function bootstrap(): Promise<void> {
  //Inyeccion de dependencias
  const agentLlmPort = createAgentLlmPortFromEnv(process.env);

  //Generacion de instancias
  const {
    flowRepository,
    sessionStateStore,
    toolRepository
  } = createPersistenceAdapters(resolvePersistenceDriver(process.env.PERSISTENCE_DRIVER));
  const createFlowUseCase = new CreateFlowUseCase(flowRepository);
  const getFlowUseCase = new GetFlowUseCase(flowRepository);
  const updateFlowUseCase = new UpdateFlowUseCase(flowRepository);
  const deleteFlowUseCase = new DeleteFlowUseCase(flowRepository);
  const createSessionUseCase = new CreateSessionUseCase(sessionStateStore, flowRepository);
  const runConversationTurnUseCase = new RunConversationTurnUseCase(
    sessionStateStore,
    flowRepository,
    toolRepository,
    agentLlmPort
  );
  const validateFlowUseCase = new ValidateFlowUseCase();

  //Creacion y arranque del servidor HTTP
  const httpServer = await createHttpServer({
    createFlowUseCase,
    getFlowUseCase,
    updateFlowUseCase,
    deleteFlowUseCase,
    createSessionUseCase,
    runConversationTurnUseCase,
    validateFlowUseCase
  });

  const port = Number(process.env.PORT ?? "3000");
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid PORT value: ${process.env.PORT ?? "(undefined)"}`);
  }
  await httpServer.listen({ port, host: "127.0.0.1" });
}

bootstrap().catch((error) => {
  console.error("Failed to start API server", error);
  process.exitCode = 1;
});

function resolvePersistenceDriver(input: string | undefined): PersistenceDriver {
  if (!input) {
    return "memory";
  }

  const normalized = input.trim().toLowerCase();
  if (normalized === "memory" || normalized === "supabase") {
    return normalized;
  }

  throw new Error(
    `Unsupported PERSISTENCE_DRIVER: ${input}. Available: memory, supabase`
  );
}

function createPersistenceAdapters(
  driver: PersistenceDriver
): {
  flowRepository: IFlowRepository;
  sessionStateStore: ISessionStateStore;
  toolRepository: IToolRepository;
} {
  if (driver === "supabase") {
    const supabaseClient = createSupabaseClientFromEnv(process.env);
    const embeddingDimensions = parseOptionalInteger(process.env.TOOL_EMBEDDING_DIMENSIONS);
    return {
      flowRepository: new SupabaseFlowRepository(supabaseClient),
      sessionStateStore: new SupabaseSessionStateStore(supabaseClient),
      toolRepository: new SupabaseToolRepository(supabaseClient, {
        ...(process.env.GEMINI_API_KEY ? { geminiApiKey: process.env.GEMINI_API_KEY } : {}),
        ...(process.env.GOOGLE_API_KEY ? { googleApiKey: process.env.GOOGLE_API_KEY } : {}),
        ...(process.env.GOOGLE_BASE_URL ? { googleBaseUrl: process.env.GOOGLE_BASE_URL } : {}),
        ...(process.env.TOOL_EMBEDDING_MODEL
          ? { embeddingModel: process.env.TOOL_EMBEDDING_MODEL }
          : {}),
        ...(embeddingDimensions !== undefined ? { embeddingDimensions } : {})
      })
    };
  }

  return {
    flowRepository: new InMemoryFlowRepository(),
    sessionStateStore: new InMemorySessionStateStore(),
    toolRepository: new InMemoryToolRepository()
  };
}

function parseOptionalInteger(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid integer value: ${value}`);
  }

  return Math.trunc(parsed);
}
