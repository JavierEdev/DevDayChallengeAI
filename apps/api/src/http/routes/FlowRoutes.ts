import type { FastifyInstance } from "fastify";
import {
  createFlowRequestSchema,
  createFlowResponseSchema,
  deleteFlowResponseSchema,
  flowDefinitionSchema,
  getFlowResponseSchema,
  idSchema,
  type CreateFlowRequest,
  type FlowDefinition,
  type UpdateFlowRequest,
  updateFlowRequestSchema,
  updateFlowResponseSchema,
  validateFlowResponseSchema
} from "@devday/shared";
import { z } from "zod";

import { ErrorCodes } from "../../application/common/ErrorCodes.js";
import { FlowAlreadyExistsError } from "../../application/errors/FlowAlreadyExistsError.js";
import { FlowNotFoundError } from "../../application/errors/FlowNotFoundError.js";
import type { CreateFlowUseCase } from "../../application/flow/CreateFlowUseCase.js";
import type { DeleteFlowUseCase } from "../../application/flow/DeleteFlowUseCase.js";
import type { GetFlowUseCase } from "../../application/flow/GetFlowUseCase.js";
import type { UpdateFlowUseCase } from "../../application/flow/UpdateFlowUseCase.js";
import type { ValidateFlowUseCase } from "../../application/flow/ValidateFlowUseCase.js";

export interface IFlowRoutesDependencies {
  createFlowUseCase: CreateFlowUseCase;
  getFlowUseCase: GetFlowUseCase;
  updateFlowUseCase: UpdateFlowUseCase;
  deleteFlowUseCase: DeleteFlowUseCase;
  validateFlowUseCase: ValidateFlowUseCase;
}

interface IFlowPathParams {
  flowId: string;
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

const flowPathParamsJsonSchema = z.toJSONSchema(
  z.object({
    flowId: idSchema
  }),
  {
    target: "draft-7"
  }
);
const createFlowRequestJsonSchema = z.toJSONSchema(createFlowRequestSchema, {
  target: "draft-7"
});
const createFlowResponseJsonSchema = z.toJSONSchema(createFlowResponseSchema, {
  target: "draft-7"
});
const getFlowResponseJsonSchema = z.toJSONSchema(getFlowResponseSchema, {
  target: "draft-7"
});
const updateFlowRequestJsonSchema = z.toJSONSchema(updateFlowRequestSchema, {
  target: "draft-7"
});
const updateFlowResponseJsonSchema = z.toJSONSchema(updateFlowResponseSchema, {
  target: "draft-7"
});
const deleteFlowResponseJsonSchema = z.toJSONSchema(deleteFlowResponseSchema, {
  target: "draft-7"
});
const flowDefinitionJsonSchema = z.toJSONSchema(flowDefinitionSchema, {
  target: "draft-7"
});
const validateFlowResponseJsonSchema = z.toJSONSchema(validateFlowResponseSchema, {
  target: "draft-7"
});

export function registerFlowRoutes(
  fastify: FastifyInstance,
  dependencies: IFlowRoutesDependencies
): void {
  fastify.post(
    "/v1/flows",
    {
      schema: {
        tags: ["Flows"],
        summary: "Guardar una definicion de flujo",
        body: createFlowRequestJsonSchema,
        response: {
          201: createFlowResponseJsonSchema,
          400: errorResponseJsonSchema,
          409: errorResponseJsonSchema,
          500: errorResponseJsonSchema
        }
      }
    },
    async (request, reply) => {
      const parsedRequest = createFlowRequestSchema.safeParse(request.body);
      if (!parsedRequest.success) {
        return reply.code(400).send({
          error: ErrorCodes.VALIDATION_ERROR,
          details: parsedRequest.error.flatten()
        });
      }

      const flowValidation = dependencies.validateFlowUseCase.execute(
        parsedRequest.data as FlowDefinition
      );
      if (!flowValidation.valid) {
        return reply.code(400).send({
          error: ErrorCodes.VALIDATION_ERROR,
          details: flowValidation
        });
      }

      try {
        const result = await dependencies.createFlowUseCase.execute(
          parsedRequest.data as CreateFlowRequest
        );
        const parsedResponse = createFlowResponseSchema.safeParse(result);
        if (!parsedResponse.success) {
          request.log.error(
            { error: parsedResponse.error.flatten() },
            "CreateFlow response failed schema validation"
          );
          return reply.code(500).send({
            error: ErrorCodes.INTERNAL_SERVER_ERROR
          });
        }

        return reply.code(201).send(parsedResponse.data);
      } catch (error) {
        if (error instanceof FlowAlreadyExistsError) {
          return reply.code(409).send({
            error: ErrorCodes.FLOW_ALREADY_EXISTS,
            message: error.message
          });
        }

        request.log.error({ error }, "Unexpected error in create flow endpoint");
        return reply.code(500).send({
          error: ErrorCodes.INTERNAL_SERVER_ERROR
        });
      }
    }
  );

  fastify.get<{ Params: IFlowPathParams }>(
    "/v1/flows/:flowId",
    {
      schema: {
        tags: ["Flows"],
        summary: "Obtener una definicion de flujo",
        params: flowPathParamsJsonSchema,
        response: {
          200: getFlowResponseJsonSchema,
          400: errorResponseJsonSchema,
          404: errorResponseJsonSchema,
          500: errorResponseJsonSchema
        }
      }
    },
    async (request, reply) => {
      const parsedFlowId = idSchema.safeParse(request.params.flowId);
      if (!parsedFlowId.success) {
        return reply.code(400).send({
          error: ErrorCodes.VALIDATION_ERROR,
          details: parsedFlowId.error.flatten()
        });
      }

      try {
        const result = await dependencies.getFlowUseCase.execute(parsedFlowId.data);
        const parsedResponse = getFlowResponseSchema.safeParse(result);
        if (!parsedResponse.success) {
          request.log.error(
            { error: parsedResponse.error.flatten() },
            "GetFlow response failed schema validation"
          );
          return reply.code(500).send({
            error: ErrorCodes.INTERNAL_SERVER_ERROR
          });
        }

        return reply.code(200).send(parsedResponse.data);
      } catch (error) {
        if (error instanceof FlowNotFoundError) {
          return reply.code(404).send({
            error: ErrorCodes.FLOW_NOT_FOUND,
            message: error.message
          });
        }

        request.log.error({ error }, "Unexpected error in get flow endpoint");
        return reply.code(500).send({
          error: ErrorCodes.INTERNAL_SERVER_ERROR
        });
      }
    }
  );

  fastify.put<{ Params: IFlowPathParams }>(
    "/v1/flows/:flowId",
    {
      schema: {
        tags: ["Flows"],
        summary: "Actualizar una definicion de flujo",
        params: flowPathParamsJsonSchema,
        body: updateFlowRequestJsonSchema,
        response: {
          200: updateFlowResponseJsonSchema,
          400: errorResponseJsonSchema,
          404: errorResponseJsonSchema,
          500: errorResponseJsonSchema
        }
      }
    },
    async (request, reply) => {
      const parsedFlowId = idSchema.safeParse(request.params.flowId);
      if (!parsedFlowId.success) {
        return reply.code(400).send({
          error: ErrorCodes.VALIDATION_ERROR,
          details: parsedFlowId.error.flatten()
        });
      }

      const parsedRequest = updateFlowRequestSchema.safeParse(request.body);
      if (!parsedRequest.success) {
        return reply.code(400).send({
          error: ErrorCodes.VALIDATION_ERROR,
          details: parsedRequest.error.flatten()
        });
      }

      if (parsedRequest.data.id !== parsedFlowId.data) {
        return reply.code(400).send({
          error: ErrorCodes.FLOW_ID_MISMATCH,
          message: "El id del path y el id del body deben coincidir."
        });
      }

      const flowValidation = dependencies.validateFlowUseCase.execute(
        parsedRequest.data as FlowDefinition
      );
      if (!flowValidation.valid) {
        return reply.code(400).send({
          error: ErrorCodes.VALIDATION_ERROR,
          details: flowValidation
        });
      }

      try {
        const result = await dependencies.updateFlowUseCase.execute(
          parsedFlowId.data,
          parsedRequest.data as UpdateFlowRequest
        );
        const parsedResponse = updateFlowResponseSchema.safeParse(result);
        if (!parsedResponse.success) {
          request.log.error(
            { error: parsedResponse.error.flatten() },
            "UpdateFlow response failed schema validation"
          );
          return reply.code(500).send({
            error: ErrorCodes.INTERNAL_SERVER_ERROR
          });
        }

        return reply.code(200).send(parsedResponse.data);
      } catch (error) {
        if (error instanceof FlowNotFoundError) {
          return reply.code(404).send({
            error: ErrorCodes.FLOW_NOT_FOUND,
            message: error.message
          });
        }

        request.log.error({ error }, "Unexpected error in update flow endpoint");
        return reply.code(500).send({
          error: ErrorCodes.INTERNAL_SERVER_ERROR
        });
      }
    }
  );

  fastify.delete<{ Params: IFlowPathParams }>(
    "/v1/flows/:flowId",
    {
      schema: {
        tags: ["Flows"],
        summary: "Eliminar una definicion de flujo",
        params: flowPathParamsJsonSchema,
        response: {
          200: deleteFlowResponseJsonSchema,
          400: errorResponseJsonSchema,
          404: errorResponseJsonSchema,
          500: errorResponseJsonSchema
        }
      }
    },
    async (request, reply) => {
      const parsedFlowId = idSchema.safeParse(request.params.flowId);
      if (!parsedFlowId.success) {
        return reply.code(400).send({
          error: ErrorCodes.VALIDATION_ERROR,
          details: parsedFlowId.error.flatten()
        });
      }

      try {
        const result = await dependencies.deleteFlowUseCase.execute(parsedFlowId.data);
        const parsedResponse = deleteFlowResponseSchema.safeParse(result);
        if (!parsedResponse.success) {
          request.log.error(
            { error: parsedResponse.error.flatten() },
            "DeleteFlow response failed schema validation"
          );
          return reply.code(500).send({
            error: ErrorCodes.INTERNAL_SERVER_ERROR
          });
        }

        return reply.code(200).send(parsedResponse.data);
      } catch (error) {
        if (error instanceof FlowNotFoundError) {
          return reply.code(404).send({
            error: ErrorCodes.FLOW_NOT_FOUND,
            message: error.message
          });
        }

        request.log.error({ error }, "Unexpected error in delete flow endpoint");
        return reply.code(500).send({
          error: ErrorCodes.INTERNAL_SERVER_ERROR
        });
      }
    }
  );

  fastify.post(
    "/v1/flows/validate",
    {
      schema: {
        tags: ["Flows"],
        summary: "Validar una definicion de flujo",
        body: flowDefinitionJsonSchema,
        response: {
          200: validateFlowResponseJsonSchema,
          400: errorResponseJsonSchema,
          500: errorResponseJsonSchema
        }
      }
    },
    async (request, reply) => {
      const parsedRequest = flowDefinitionSchema.safeParse(request.body);
      if (!parsedRequest.success) {
        return reply.code(400).send({
          error: ErrorCodes.VALIDATION_ERROR,
          details: parsedRequest.error.flatten()
        });
      }

      const result = dependencies.validateFlowUseCase.execute(
        parsedRequest.data as FlowDefinition
      );
      const parsedResponse = validateFlowResponseSchema.safeParse(result);
      if (!parsedResponse.success) {
        request.log.error(
          { error: parsedResponse.error.flatten() },
          "ValidateFlow response failed schema validation"
        );
        return reply.code(500).send({
          error: ErrorCodes.INTERNAL_SERVER_ERROR
        });
      }

      return reply.code(200).send(parsedResponse.data);
    }
  );
}
