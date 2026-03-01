import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { ErrorCodes } from "../../application/common/ErrorCodes.js";
import { FlowNotFoundError } from "../../application/errors/FlowNotFoundError.js";
import type { HandleTelegramMessageUseCase } from "../../application/channel/HandleTelegramMessageUseCase.js";

export interface ITelegramRoutesDependencies {
  telegramWebhookSecret: string;
  telegramDefaultFlowId: string;
  handleTelegramMessageUseCase: HandleTelegramMessageUseCase;
}

interface ITelegramWebhookPathParams {
  secret: string;
}

const telegramMessageSchema = z.object({
  text: z.string().optional(),
  chat: z.object({
    id: z.union([z.string(), z.number(), z.bigint()]).transform((value) => String(value))
  })
});

const telegramUpdateSchema = z.object({
  update_id: z.number().int().optional(),
  message: telegramMessageSchema.optional()
});

const okResponseJsonSchema = z.toJSONSchema(
  z.object({
    ok: z.boolean()
  }),
  {
    target: "draft-7"
  }
);

const errorResponseJsonSchema = z.toJSONSchema(
  z.object({
    error: z.string(),
    message: z.string().optional(),
    details: z.unknown().optional()
  }),
  {
    target: "draft-7"
  }
);

export function registerTelegramRoutes(
  fastify: FastifyInstance,
  dependencies: ITelegramRoutesDependencies
): void {
  fastify.post<{ Params: ITelegramWebhookPathParams }>(
    "/v1/channels/telegram/webhook/:secret",
    {
      schema: {
        tags: ["Channels"],
        summary: "Webhook de Telegram Bot API",
        response: {
          200: okResponseJsonSchema,
          401: errorResponseJsonSchema,
          400: errorResponseJsonSchema,
          404: errorResponseJsonSchema,
          500: errorResponseJsonSchema
        }
      }
    },
    async (request, reply) => {
      if (request.params.secret !== dependencies.telegramWebhookSecret) {
        return reply.code(401).send({
          error: ErrorCodes.VALIDATION_ERROR,
          message: "Invalid webhook secret"
        });
      }

      const parsedUpdate = telegramUpdateSchema.safeParse(request.body);
      if (!parsedUpdate.success) {
        return reply.code(400).send({
          error: ErrorCodes.VALIDATION_ERROR,
          details: parsedUpdate.error.flatten()
        });
      }

      const update = parsedUpdate.data;
      const message = update.message;
      const text = message?.text?.trim();
      const externalChatId = message?.chat.id;

      // Telegram envia updates no-text (join, stickers, etc.). Se ignoran con 200.
      if (!externalChatId || !text) {
        return reply.code(200).send({ ok: true });
      }

      try {
        await dependencies.handleTelegramMessageUseCase.execute({
          externalChatId,
          text,
          flowId: dependencies.telegramDefaultFlowId
        });

        return reply.code(200).send({ ok: true });
      } catch (error) {
        if (error instanceof FlowNotFoundError) {
          request.log.error(
            { error, telegramDefaultFlowId: dependencies.telegramDefaultFlowId },
            "Telegram default flow not found"
          );
          return reply.code(404).send({
            error: ErrorCodes.FLOW_NOT_FOUND,
            message: error.message
          });
        }

        request.log.error({ error }, "Unexpected error in telegram webhook endpoint");
        return reply.code(500).send({
          error: ErrorCodes.INTERNAL_SERVER_ERROR
        });
      }
    }
  );
}
