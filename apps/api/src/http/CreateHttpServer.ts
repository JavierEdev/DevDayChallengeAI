import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";

import type { CreateFlowUseCase } from "../application/flow/CreateFlowUseCase.js";
import type { DeleteFlowUseCase } from "../application/flow/DeleteFlowUseCase.js";
import type { GetFlowUseCase } from "../application/flow/GetFlowUseCase.js";
import type { UpdateFlowUseCase } from "../application/flow/UpdateFlowUseCase.js";
import type { RunConversationTurnUseCase } from "../application/chat/RunConversationTurnUseCase.js";
import type { CreateSessionUseCase } from "../application/session/CreateSessionUseCase.js";
import type { ValidateFlowUseCase } from "../application/flow/ValidateFlowUseCase.js";
import { registerChatRoutes } from "./routes/ChatRoutes.js";
import { registerFlowRoutes } from "./routes/FlowRoutes.js";
import { registerSessionRoutes } from "./routes/SessionRoutes.js";

export interface ICreateHttpServerDependencies {
  createFlowUseCase: CreateFlowUseCase;
  getFlowUseCase: GetFlowUseCase;
  updateFlowUseCase: UpdateFlowUseCase;
  deleteFlowUseCase: DeleteFlowUseCase;
  createSessionUseCase: CreateSessionUseCase;
  runConversationTurnUseCase: RunConversationTurnUseCase;
  validateFlowUseCase: ValidateFlowUseCase;
}

export async function createHttpServer(
  dependencies: ICreateHttpServerDependencies
): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info"
    }
  });

  await fastify.register(cors, {
    origin: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false
  });

  await fastify.register(swagger, {
    openapi: {
      info: {
        title: "DevDay Challenge API",
        description: "API para ejecucion de sesiones conversacionales y validacion de flujos.",
        version: "0.1.0"
      },
      tags: [
        { name: "Health", description: "Health checks del API" },
        { name: "Sessions", description: "Gestion de sesiones de chat runtime" },
        { name: "Chat", description: "Mensajeria y ejecucion conversacional" },
        { name: "Flows", description: "Gestion y validacion de definiciones de flujo" }
      ]
    }
  });

  fastify.get(
    "/health",
    {
      schema: {
        tags: ["Health"],
        summary: "Health check",
        response: {
          200: {
            type: "object",
            properties: {
              ok: { type: "boolean" }
            },
            required: ["ok"]
          }
        }
      }
    },
    async () => ({ ok: true })
  );

  registerSessionRoutes(fastify, {
    createSessionUseCase: dependencies.createSessionUseCase
  });

  registerChatRoutes(fastify, {
    runConversationTurnUseCase: dependencies.runConversationTurnUseCase
  });

  registerFlowRoutes(fastify, {
    createFlowUseCase: dependencies.createFlowUseCase,
    getFlowUseCase: dependencies.getFlowUseCase,
    updateFlowUseCase: dependencies.updateFlowUseCase,
    deleteFlowUseCase: dependencies.deleteFlowUseCase,
    validateFlowUseCase: dependencies.validateFlowUseCase
  });

  await fastify.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: true
    }
  });

  return fastify;
}
