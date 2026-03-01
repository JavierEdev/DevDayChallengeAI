import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

import { createHttpServer } from "./http/CreateHttpServer.js";
import { CreateFlowUseCase } from "./application/flow/CreateFlowUseCase.js";
import { DeleteFlowUseCase } from "./application/flow/DeleteFlowUseCase.js";
import { GetFlowUseCase } from "./application/flow/GetFlowUseCase.js";
import { UpdateFlowUseCase } from "./application/flow/UpdateFlowUseCase.js";
import { RunConversationTurnUseCase } from "./application/chat/RunConversationTurnUseCase.js";
import { HandleTelegramMessageUseCase } from "./application/channel/HandleTelegramMessageUseCase.js";
import { CreateSessionUseCase } from "./application/session/CreateSessionUseCase.js";
import { ValidateFlowUseCase } from "./application/flow/ValidateFlowUseCase.js";
import type { IFlowRepository } from "./domain/flow/IFlowRepository.js";
import type { IExternalSessionLinkStore } from "./domain/session/IExternalSessionLinkStore.js";
import type { ISessionStateStore } from "./domain/session/ISessionStateStore.js";
import type { IToolRepository } from "./domain/tool/IToolRepository.js";
import { createAgentLlmPortFromEnv } from "./infrastructure/llm/CreateAgentLlmPort.js";
import { TelegramBotApiSender } from "./infrastructure/channel/telegram/TelegramBotApiSender.js";
import { TelegramLongPollingRunner } from "./infrastructure/channel/telegram/TelegramLongPollingRunner.js";
import { InMemoryFlowRepository } from "./infrastructure/flow/InMemoryFlowRepository.js";
import { InMemoryExternalSessionLinkStore } from "./infrastructure/session/InMemoryExternalSessionLinkStore.js";
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
    toolRepository,
    externalSessionLinkStore
  } = createInMemoryAdapters();
  console.info("[bootstrap] persistence_driver=memory");
  const createFlowUseCase = new CreateFlowUseCase(flowRepository);
  const getFlowUseCase = new GetFlowUseCase(flowRepository);
  const updateFlowUseCase = new UpdateFlowUseCase(flowRepository);
  const deleteFlowUseCase = new DeleteFlowUseCase(flowRepository);
  const createSessionUseCase = new CreateSessionUseCase(sessionStateStore, flowRepository);
  const configuredUseAgentLlm = parseOptionalBoolean(process.env.USE_AGENT_LLM, "USE_AGENT_LLM");
  const configuredUseValidatorLlm = parseOptionalBoolean(
    process.env.USE_VALIDATOR_LLM,
    "USE_VALIDATOR_LLM"
  );
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
      })(),
      ...(configuredUseAgentLlm !== undefined ? { useAgentLlm: configuredUseAgentLlm } : {}),
      ...(configuredUseValidatorLlm !== undefined
        ? { useValidatorLlm: configuredUseValidatorLlm }
        : {})
    }
  );
  const validateFlowUseCase = new ValidateFlowUseCase();
  const telegramChannelConfig = resolveTelegramChannelConfig(process.env);
  const handleTelegramMessageUseCase = telegramChannelConfig
    ? new HandleTelegramMessageUseCase(
        externalSessionLinkStore,
        createSessionUseCase,
        getFlowUseCase,
        runConversationTurnUseCase,
        new TelegramBotApiSender({
          botToken: telegramChannelConfig.botToken
        })
      )
    : undefined;
  if (telegramChannelConfig) {
    console.info(`[bootstrap] channel_driver=telegram enabled transport=${telegramChannelConfig.transport}`);
  } else {
    console.info("[bootstrap] channel_driver=telegram disabled (missing env configuration)");
  }

  //Creacion y arranque del servidor HTTP
  const httpServer = await createHttpServer({
    createFlowUseCase,
    getFlowUseCase,
    updateFlowUseCase,
    deleteFlowUseCase,
    createSessionUseCase,
    runConversationTurnUseCase,
    validateFlowUseCase,
    handleTelegramMessageUseCase,
    telegramWebhookSecret:
      telegramChannelConfig?.transport === "webhook" ? telegramChannelConfig.webhookSecret : undefined,
    telegramDefaultFlowId: telegramChannelConfig?.defaultFlowId
  });

  const port = Number(process.env.PORT ?? "3000");
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid PORT value: ${process.env.PORT ?? "(undefined)"}`);
  }
  await httpServer.listen({ port, host: "127.0.0.1" });

  if (telegramChannelConfig?.transport === "polling" && handleTelegramMessageUseCase) {
    const pollingTimeoutSeconds = parseOptionalPositiveInteger(
      process.env.TELEGRAM_POLLING_TIMEOUT_SECONDS,
      "TELEGRAM_POLLING_TIMEOUT_SECONDS"
    );
    const pollingRetryDelayMs = parseOptionalPositiveInteger(
      process.env.TELEGRAM_POLLING_RETRY_DELAY_MS,
      "TELEGRAM_POLLING_RETRY_DELAY_MS"
    );
    const telegramPollingRunner = new TelegramLongPollingRunner({
      botToken: telegramChannelConfig.botToken,
      ...(pollingTimeoutSeconds !== undefined ? { pollingTimeoutSeconds } : {}),
      ...(pollingRetryDelayMs !== undefined ? { retryDelayMs: pollingRetryDelayMs } : {}),
      onTextMessage: async ({ externalChatId, text }) => {
        await handleTelegramMessageUseCase.execute({
          externalChatId,
          text,
          fallbackFlowId: telegramChannelConfig.defaultFlowId
        });
      }
    });
    telegramPollingRunner.start();
  }
}

bootstrap().catch((error) => {
  console.error("Failed to start API server", error);
  process.exitCode = 1;
});

function createInMemoryAdapters(): {
  flowRepository: IFlowRepository;
  sessionStateStore: ISessionStateStore;
  toolRepository: IToolRepository;
  externalSessionLinkStore: IExternalSessionLinkStore;
} {
  return {
    flowRepository: new InMemoryFlowRepository(),
    sessionStateStore: new InMemorySessionStateStore(),
    toolRepository: createLocalJsonToolRepository(),
    externalSessionLinkStore: new InMemoryExternalSessionLinkStore()
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

function parseOptionalBoolean(
  value: string | undefined,
  variableName: string
): boolean | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes") {
    return true;
  }
  if (normalized === "false" || normalized === "0" || normalized === "no") {
    return false;
  }

  throw new Error(`Invalid boolean for ${variableName}: ${value}`);
}

interface ITelegramChannelConfig {
  botToken: string;
  transport: "webhook" | "polling";
  webhookSecret?: string;
  defaultFlowId?: string;
}

function resolveTelegramChannelConfig(env: NodeJS.ProcessEnv): ITelegramChannelConfig | undefined {
  const botToken = env.TELEGRAM_BOT_TOKEN?.trim();
  const defaultFlowId = env.TELEGRAM_DEFAULT_FLOW_ID?.trim() || undefined;
  const transport = resolveTelegramTransport(env.TELEGRAM_TRANSPORT);
  const webhookSecret = env.TELEGRAM_WEBHOOK_SECRET?.trim();

  if (!botToken) {
    return undefined;
  }
  if (transport === "webhook" && !webhookSecret) {
    throw new Error("Missing TELEGRAM_WEBHOOK_SECRET for webhook transport");
  }

  return {
    botToken,
    transport,
    ...(webhookSecret ? { webhookSecret } : {}),
    ...(defaultFlowId ? { defaultFlowId } : {})
  };
}

function resolveTelegramTransport(value: string | undefined): "webhook" | "polling" {
  if (!value) {
    return "polling";
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "polling" || normalized === "webhook") {
    return normalized;
  }

  throw new Error(`Invalid TELEGRAM_TRANSPORT value: ${value}`);
}
