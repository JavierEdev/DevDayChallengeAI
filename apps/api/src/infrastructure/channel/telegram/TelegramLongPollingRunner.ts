export interface ITelegramLongPollingRunnerOptions {
  botToken: string;
  onTextMessage: (input: { externalChatId: string; text: string }) => Promise<void>;
  pollingTimeoutSeconds?: number;
  retryDelayMs?: number;
  apiBaseUrl?: string;
  logger?: {
    info: (message: string) => void;
    warn: (message: string) => void;
    error: (message: string) => void;
  };
}

interface ITelegramUpdateMessage {
  chat?: {
    id?: number | string | bigint;
  };
  text?: string;
}

interface ITelegramUpdate {
  update_id?: number;
  message?: ITelegramUpdateMessage;
}

interface ITelegramGetUpdatesResponse {
  ok?: boolean;
  result?: ITelegramUpdate[];
}

const DEFAULT_POLLING_TIMEOUT_SECONDS = 25;
const DEFAULT_RETRY_DELAY_MS = 1_500;

export class TelegramLongPollingRunner {
  private readonly botToken: string;
  private readonly onTextMessage: ITelegramLongPollingRunnerOptions["onTextMessage"];
  private readonly pollingTimeoutSeconds: number;
  private readonly retryDelayMs: number;
  private readonly apiBaseUrl: string;
  private readonly logger: NonNullable<ITelegramLongPollingRunnerOptions["logger"]>;
  private running = false;
  private offset = 0;
  private loopPromise: Promise<void> | null = null;

  constructor(options: ITelegramLongPollingRunnerOptions) {
    this.botToken = options.botToken;
    this.onTextMessage = options.onTextMessage;
    this.pollingTimeoutSeconds =
      options.pollingTimeoutSeconds ?? DEFAULT_POLLING_TIMEOUT_SECONDS;
    this.retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
    this.apiBaseUrl = options.apiBaseUrl ?? "https://api.telegram.org";
    this.logger = options.logger ?? console;
  }

  start(): void {
    if (this.running) {
      return;
    }

    this.running = true;
    this.loopPromise = this.runLoop().catch((error) => {
      this.logger.error(
        `[telegram-polling] fatal loop error: ${formatUnknownError(error)}`
      );
    });
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.loopPromise) {
      await this.loopPromise;
    }
  }

  private async runLoop(): Promise<void> {
    this.logger.info("[telegram-polling] started");
    while (this.running) {
      try {
        const updates = await this.getUpdates();
        for (const update of updates) {
          if (typeof update.update_id === "number") {
            this.offset = Math.max(this.offset, update.update_id + 1);
          }

          const text = update.message?.text?.trim();
          const chatIdValue = update.message?.chat?.id;
          if (!text || chatIdValue === undefined || chatIdValue === null) {
            continue;
          }

          const externalChatId = String(chatIdValue);
          await this.onTextMessage({ externalChatId, text });
        }
      } catch (error) {
        this.logger.warn(
          `[telegram-polling] loop error: ${formatUnknownError(error)}`
        );
        await sleep(this.retryDelayMs);
      }
    }

    this.logger.info("[telegram-polling] stopped");
  }

  private async getUpdates(): Promise<ITelegramUpdate[]> {
    const endpoint = `${this.apiBaseUrl}/bot${this.botToken}/getUpdates`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        offset: this.offset,
        timeout: this.pollingTimeoutSeconds,
        allowed_updates: ["message"]
      })
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Telegram getUpdates failed (${response.status}): ${body}`);
    }

    const payload = (await response.json()) as ITelegramGetUpdatesResponse;
    if (!payload.ok || !Array.isArray(payload.result)) {
      throw new Error("Telegram getUpdates payload is invalid");
    }

    return payload.result;
  }
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function formatUnknownError(error: unknown): string {
  if (error instanceof Error) {
    const cause =
      error.cause instanceof Error
        ? `${error.cause.name}: ${error.cause.message}`
        : error.cause !== undefined
          ? String(error.cause)
          : undefined;
    return cause ? `${error.name}: ${error.message} | cause=${cause}` : `${error.name}: ${error.message}`;
  }

  return String(error);
}
