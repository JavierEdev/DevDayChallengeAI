import type { FastifyInstance } from "fastify";
import {
  createSessionRequestSchema,
  createSessionResponseSchema,
  type CreateSessionRequest
} from "@devday/shared";
import { z } from "zod";

import type { CreateSessionUseCase } from "../../application/session/CreateSessionUseCase.js";
import { FlowNotFoundError } from "../../application/errors/FlowNotFoundError.js";
import { ErrorCodes } from "../../application/common/ErrorCodes.js";

export interface ISessionRoutesDependencies {
  createSessionUseCase: CreateSessionUseCase;
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

const createSessionRequestJsonSchema = z.toJSONSchema(createSessionRequestSchema, {
  target: "draft-7"
});
const createSessionResponseJsonSchema = z.toJSONSchema(createSessionResponseSchema, {
  target: "draft-7"
});

export function registerSessionRoutes(
  fastify: FastifyInstance,
  dependencies: ISessionRoutesDependencies
): void {
  fastify.post(
    "/v1/sessions",
    {
      schema: {
        tags: ["Sessions"],
        summary: "Crear una sesion runtime",
        body: createSessionRequestJsonSchema,
        response: {
          201: createSessionResponseJsonSchema,
          400: errorResponseJsonSchema,
          404: errorResponseJsonSchema,
          500: errorResponseJsonSchema
        }
      }
    },
    async (request, reply) => {
      const parsedRequest = createSessionRequestSchema.safeParse(request.body);
      if (!parsedRequest.success) {
        return reply.code(400).send({
          error: ErrorCodes.VALIDATION_ERROR,
          details: parsedRequest.error.flatten()
        });
      }

      try {
        const result = await dependencies.createSessionUseCase.execute(
          parsedRequest.data as CreateSessionRequest
        );
        const parsedResponse = createSessionResponseSchema.safeParse(result);
        if (!parsedResponse.success) {
          request.log.error(
            { error: parsedResponse.error.flatten() },
            "CreateSession response failed schema validation"
          );
          return reply.code(500).send({
            error: ErrorCodes.INTERNAL_SERVER_ERROR
          });
        }

        return reply.code(201).send(parsedResponse.data);
      } catch (error) {
        if (error instanceof FlowNotFoundError) {
          return reply.code(404).send({
            error: ErrorCodes.FLOW_NOT_FOUND,
            message: error.message
          });
        }

        request.log.error({ error }, "Unexpected error in create session endpoint");
        return reply.code(500).send({
          error: ErrorCodes.INTERNAL_SERVER_ERROR
        });
      }
    }
  );
}
