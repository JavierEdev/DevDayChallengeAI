import axios from "axios";

import {
  createFlowRequestSchema,
  createFlowResponseSchema,
  createSessionRequestSchema,
  createSessionResponseSchema,
  getFlowResponseSchema,
  sendMessageRequestSchema,
  sendMessageResponseSchema,
  updateFlowRequestSchema,
  updateFlowResponseSchema,
  validateFlowResponseSchema
} from "@shared/contracts/api/schemas";
import type {
  CreateSessionResponse,
  SendMessageResponse,
  ValidateFlowResponse
} from "@shared/contracts/api/types";
import { flowDefinitionSchema } from "@shared/contracts/flow/schemas";
import type { FlowDefinition } from "@shared/contracts/flow/types";

interface ApiErrorShape {
  error?: string;
  message?: string;
}

const DEFAULT_API_TIMEOUT_MS = 60 * 10000; 
const configuredTimeout = Number(import.meta.env.VITE_API_TIMEOUT_MS ?? DEFAULT_API_TIMEOUT_MS);
const API_TIMEOUT_MS =
  Number.isFinite(configuredTimeout) && configuredTimeout > 0
    ? Math.trunc(configuredTimeout)
    : DEFAULT_API_TIMEOUT_MS;

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:3037",
  timeout: API_TIMEOUT_MS
});

function toApiError(error: unknown): Error {
  if (axios.isAxiosError(error)) {
    if (error.code === "ECONNABORTED") {
      return new Error(
        `Tiempo de espera agotado (${API_TIMEOUT_MS}ms) al llamar al API (${apiClient.defaults.baseURL}).`
      );
    }

    const data = error.response?.data as ApiErrorShape | undefined;
    const errorCode = data?.error;
    const message = data?.message ?? error.message;
    return new Error(errorCode ? `${errorCode}: ${message}` : message);
  }

  return error instanceof Error ? error : new Error("Unknown API error");
}

function isFlowNotFoundError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  const data = error.response?.data as ApiErrorShape | undefined;
  return error.response?.status === 404 || data?.error === "FLOW_NOT_FOUND";
}

export async function createFlow(flowDefinition: FlowDefinition): Promise<FlowDefinition> {
  try {
    const parsedFlow = flowDefinitionSchema.parse(flowDefinition);
    const requestBody = createFlowRequestSchema.parse({
      name: parsedFlow.name,
      description: parsedFlow.description,
      version: parsedFlow.version,
      startNodeId: parsedFlow.startNodeId,
      nodes: parsedFlow.nodes,
      edges: parsedFlow.edges,
      metadata: parsedFlow.metadata
    });
    const response = await apiClient.post("/v1/flows", requestBody);
    return createFlowResponseSchema.parse(response.data).flow;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function getFlow(flowId: string): Promise<FlowDefinition> {
  try {
    const response = await apiClient.get(`/v1/flows/${flowId}`);
    return getFlowResponseSchema.parse(response.data).flow;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function updateFlow(
  flowId: string,
  flowDefinition: FlowDefinition
): Promise<FlowDefinition> {
  try {
    const requestBody = updateFlowRequestSchema.parse(flowDefinitionSchema.parse(flowDefinition));
    const response = await apiClient.put(`/v1/flows/${flowId}`, requestBody);
    return updateFlowResponseSchema.parse(response.data).flow;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function upsertFlow(flowDefinition: FlowDefinition): Promise<FlowDefinition> {
  try {
    return await updateFlow(flowDefinition.id, flowDefinition);
  } catch (error) {
    if (!isFlowNotFoundError(error)) {
      throw error;
    }
  }

  return createFlow(flowDefinition);
}

export async function validateFlow(
  flowDefinition: FlowDefinition
): Promise<ValidateFlowResponse> {
  try {
    const requestBody = flowDefinitionSchema.parse(flowDefinition);
    const response = await apiClient.post("/v1/flows/validate", requestBody);
    return validateFlowResponseSchema.parse(response.data);
  } catch (error) {
    throw toApiError(error);
  }
}

export async function createSession(flowId: string): Promise<CreateSessionResponse> {
  try {
    const requestBody = createSessionRequestSchema.parse({ flowId });
    const response = await apiClient.post("/v1/sessions", requestBody);
    return createSessionResponseSchema.parse(response.data);
  } catch (error) {
    throw toApiError(error);
  }
}

export async function sendMessage(
  sessionId: string,
  message: string
): Promise<SendMessageResponse> {
  try {
    const requestBody = sendMessageRequestSchema.parse({
      sessionId,
      message
    });
    const response = await apiClient.post(`/v1/chat/sessions/${sessionId}/messages`, {
      message: requestBody.message,
      metadata: requestBody.metadata
    });
    return sendMessageResponseSchema.parse(response.data);
  } catch (error) {
    throw toApiError(error);
  }
}
