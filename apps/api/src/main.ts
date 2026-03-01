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
import { InMemorySessionStateStore } from "./infrastructure/session/InMemorySessionStateStore.js";
import { InMemoryToolRepository } from "./infrastructure/tool/InMemoryToolRepository.js";
import { loadToolDatasetsFromLocalJson } from "./infrastructure/tool/LoadToolDatasetsFromLocalJson.js";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectoryPath = dirname(currentFilePath);
const repoRootPath = resolve(currentDirectoryPath, "../../..");
dotenv.config({ path: resolve(currentDirectoryPath, "../.env") });

async function bootstrap(): Promise<void> {
  //Inyeccion de dependencias
  const agentLlmPort = createAgentLlmPortFromEnv(process.env);

  //Generacion de instancias
  const {
    flowRepository,
    sessionStateStore,
    toolRepository
  } = createInMemoryAdapters();
  console.info("[bootstrap] persistence_driver=memory");
  const createFlowUseCase = new CreateFlowUseCase(flowRepository);
  const getFlowUseCase = new GetFlowUseCase(flowRepository);
  const updateFlowUseCase = new UpdateFlowUseCase(flowRepository);
  const deleteFlowUseCase = new DeleteFlowUseCase(flowRepository);
  const createSessionUseCase = new CreateSessionUseCase(sessionStateStore, flowRepository);
  const runConversationTurnUseCase = new RunConversationTurnUseCase(
    sessionStateStore,
    flowRepository,
    toolRepository,
    agentLlmPort,
    {
      ...(() => {
        const agentTimeoutMs = parseOptionalPositiveInteger(
          process.env.AGENT_TIMEOUT_MS,
          "AGENT_TIMEOUT_MS"
        );
        return agentTimeoutMs !== undefined ? { agentTimeoutMs } : {};
      })()
    }
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

function createInMemoryAdapters(): {
  flowRepository: IFlowRepository;
  sessionStateStore: ISessionStateStore;
  toolRepository: IToolRepository;
} {
  return {
    flowRepository: new InMemoryFlowRepository(),
    sessionStateStore: new InMemorySessionStateStore(),
    toolRepository: createLocalJsonToolRepository()
  };
}

function createLocalJsonToolRepository(): IToolRepository {
  try {
    const datasets = loadToolDatasetsFromLocalJson({
      repoRootPath,
      ...(process.env.FAQ_JSON_PATH ? { faqPath: process.env.FAQ_JSON_PATH } : {}),
      ...(process.env.AUTOS_JSON_PATH ? { autosPath: process.env.AUTOS_JSON_PATH } : {}),
      ...(process.env.DATES_JSON_PATH ? { datesPath: process.env.DATES_JSON_PATH } : {})
    });
    console.info(
      `[bootstrap] tool_data_source=json datasets=${datasets
        .map((dataset) => `${dataset.name}:${dataset.records.length}`)
        .join(",")}`
    );
    return new InMemoryToolRepository(datasets);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.warn(
      `[bootstrap] tool_data_source=json failed (${reason}). Falling back to default in-memory datasets.`
    );
    return new InMemoryToolRepository();
  }
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

function parseOptionalPositiveInteger(
  value: string | undefined,
  variableName: string
): number | undefined {
  const parsed = parseOptionalInteger(value);
  if (parsed === undefined) {
    return undefined;
  }

  if (parsed <= 0) {
    throw new Error(`Invalid positive integer for ${variableName}: ${value}`);
  }

  return parsed;
}
