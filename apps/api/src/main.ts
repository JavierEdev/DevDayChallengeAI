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
import { createAgentLlmPortFromEnv } from "./infrastructure/llm/CreateAgentLlmPort.js";
import { InMemoryFlowRepository } from "./infrastructure/flow/InMemoryFlowRepository.js";
import { InMemorySessionStateStore } from "./infrastructure/session/InMemorySessionStateStore.js";
import { InMemoryToolRepository } from "./infrastructure/tool/InMemoryToolRepository.js";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectoryPath = dirname(currentFilePath);
dotenv.config({ path: resolve(currentDirectoryPath, "../.env") });

async function bootstrap(): Promise<void> {
  //Inyeccion de dependencias
  const agentLlmPort = createAgentLlmPortFromEnv(process.env);

  //Generacion de instancias
  const flowRepository = new InMemoryFlowRepository();
  const sessionStateStore = new InMemorySessionStateStore();
  const toolRepository = new InMemoryToolRepository();
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