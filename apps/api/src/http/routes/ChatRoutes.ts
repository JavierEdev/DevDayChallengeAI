import type { FastifyInstance } from "fastify";
import {
  idSchema,
  type SendMessageRequest,
  sendMessageRequestSchema,
  sendMessageResponseSchema
} from "@devday/shared";
import { z } from "zod";

import { ErrorCodes } from "../../application/common/ErrorCodes.js";
import { FlowNotFoundError } from "../../application/errors/FlowNotFoundError.js";
import { SessionNotFoundError } from "../../application/errors/SessionNotFoundError.js";
import type { RunConversationTurnUseCase } from "../../application/chat/RunConversationTurnUseCase.js";

export interface IChatRoutesDependencies {
  runConversationTurnUseCase: RunConversationTurnUseCase;
}

interface IChatSessionMessagePathParams {
  sessionId: string;
}

interface IChatSessionMessageBody {
  message: string;
  metadata?: Record<string, unknown>;
}

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

const sendMessagePathParamsJsonSchema = z.toJSONSchema(
  z.object({
    sessionId: idSchema
  }),
  {
    target: "draft-7"
  }
);
const sendMessageBodyJsonSchema = z.toJSONSchema(
  sendMessageRequestSchema.omit({
    sessionId: true
  }),
  {
    target: "draft-7"
  }
);
const sendMessageResponseJsonSchema = z.toJSONSchema(sendMessageResponseSchema, {
  target: "draft-7"
});

export function registerChatRoutes(
  fastify: FastifyInstance,
  dependencies: IChatRoutesDependencies
): void {
  fastify.post<{
    Params: IChatSessionMessagePathParams;
    Body: IChatSessionMessageBody;
  }>(
    "/v1/chat/sessions/:sessionId/messages",
    {
      schema: {
        tags: ["Chat"],
        summary: "Enviar mensaje de chat a una sesion",
        params: sendMessagePathParamsJsonSchema,
        body: sendMessageBodyJsonSchema,
        response: {
          200: sendMessageResponseJsonSchema,
          400: errorResponseJsonSchema,
          404: errorResponseJsonSchema,
          500: errorResponseJsonSchema
        }
      }
    },
    async (request, reply) => {
      const parsedRequest = sendMessageRequestSchema.safeParse({
        sessionId: request.params.sessionId,
        message: request.body?.message,
        metadata: request.body?.metadata
      });
      if (!parsedRequest.success) {
        return reply.code(400).send({
          error: ErrorCodes.VALIDATION_ERROR,
          details: parsedRequest.error.flatten()
        });
      }

      try {
        const result = await dependencies.runConversationTurnUseCase.execute(
          parsedRequest.data as SendMessageRequest
        );
        const parsedResponse = sendMessageResponseSchema.safeParse(result);
        if (!parsedResponse.success) {
          request.log.error(
            { error: parsedResponse.error.flatten() },
            "SendMessage response failed schema validation"
          );
          return reply.code(500).send({
            error: ErrorCodes.INTERNAL_SERVER_ERROR
          });
        }

        return reply.code(200).send(parsedResponse.data);
      } catch (error) {
        if (error instanceof SessionNotFoundError) {
          return reply.code(404).send({
            error: ErrorCodes.SESSION_NOT_FOUND,
            message: error.message
          });
        }
        if (error instanceof FlowNotFoundError) {
          return reply.code(404).send({
            error: ErrorCodes.FLOW_NOT_FOUND,
            message: error.message
          });
        }

        request.log.error({ error }, "Unexpected error in send message endpoint");
        return reply.code(500).send({
          error: ErrorCodes.INTERNAL_SERVER_ERROR
        });
      }
    }
  );
}
