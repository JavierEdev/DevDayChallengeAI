import type {
  FlowDefinition,
  FlowValidationIssue,
  ValidateFlowResponse,
} from "@devday/shared";
import { ErrorCodes } from "../common/ErrorCodes.js";

export class ValidateFlowUseCase {
  execute(flowDefinition: FlowDefinition): ValidateFlowResponse {
    const errors: FlowValidationIssue[] = [];
    const warnings: FlowValidationIssue[] = [];

    const nodeIds = new Set<string>();
    const duplicateNodeIds = new Set<string>();
    for (const node of flowDefinition.nodes) {
      if (nodeIds.has(node.id)) {
        duplicateNodeIds.add(node.id);
      } else {
        nodeIds.add(node.id);
      }
    }

    for (const nodeId of duplicateNodeIds) {
      errors.push({
        code: ErrorCodes.DUPLICATE_NODE_ID,
        message: `Duplicate node id detected: ${nodeId}`,
        severity: "error",
        nodeId,
      });
    }

    if (flowDefinition.nodes.length === 0) {
      errors.push({
        code: ErrorCodes.EMPTY_FLOW,
        message: "Flow must contain at least one node.",
        severity: "error",
      });
    }

    if (!nodeIds.has(flowDefinition.startNodeId)) {
      errors.push({
        code: ErrorCodes.INVALID_START_NODE,
        message: `startNodeId does not exist: ${flowDefinition.startNodeId}`,
        severity: "error",
        nodeId: flowDefinition.startNodeId,
      });
    }

    const startNodes = flowDefinition.nodes.filter(
      (node) => node.type === "start",
    );
    if (startNodes.length === 0) {
      errors.push({
        code: ErrorCodes.MISSING_START_NODE,
        message: "Flow requires a start node.",
        severity: "error",
      });
    } else if (startNodes.length > 1) {
      warnings.push({
        code: ErrorCodes.MULTIPLE_START_NODES,
        message: "Multiple start nodes detected. Only one is recommended.",
        severity: "warning",
      });
    }

    const edgeIds = new Set<string>();
    for (const edge of flowDefinition.edges) {
      if (edgeIds.has(edge.id)) {
        errors.push({
          code: ErrorCodes.DUPLICATE_EDGE_ID,
          message: `Duplicate edge id detected: ${edge.id}`,
          severity: "error",
          edgeId: edge.id,
        });
        continue;
      }

      edgeIds.add(edge.id);

      if (!nodeIds.has(edge.source)) {
        errors.push({
          code: ErrorCodes.EDGE_SOURCE_NOT_FOUND,
          message: `Edge source does not exist: ${edge.source}`,
          severity: "error",
          edgeId: edge.id,
          nodeId: edge.source,
        });
      }

      if (!nodeIds.has(edge.target)) {
        errors.push({
          code: ErrorCodes.EDGE_TARGET_NOT_FOUND,
          message: `Edge target does not exist: ${edge.target}`,
          severity: "error",
          edgeId: edge.id,
          nodeId: edge.target,
        });
      }
    }

    const responseNodes = flowDefinition.nodes.filter(
      (node) => node.type === "response",
    );
    if (responseNodes.length === 0) {
      warnings.push({
        code: ErrorCodes.MISSING_RESPONSE_NODE,
        message:
          "Flow has no response node. Runtime may never produce user output.",
        severity: "warning",
      });
    }

    const unreachableNodeIds = this.findUnreachableNodes(flowDefinition);
    for (const nodeId of unreachableNodeIds) {
      warnings.push({
        code: ErrorCodes.UNREACHABLE_NODE,
        message: `Node is unreachable from startNodeId: ${nodeId}`,
        severity: "warning",
        nodeId,
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private findUnreachableNodes(flowDefinition: FlowDefinition): string[] {
    const nodeIds = new Set(flowDefinition.nodes.map((node) => node.id));
    if (!nodeIds.has(flowDefinition.startNodeId)) {
      return [];
    }

    const adjacencyMap = new Map<string, string[]>();
    for (const edge of flowDefinition.edges) {
      const list = adjacencyMap.get(edge.source) ?? [];
      list.push(edge.target);
      adjacencyMap.set(edge.source, list);
    }

    const visited = new Set<string>();
    const pending: string[] = [flowDefinition.startNodeId];

    while (pending.length > 0) {
      const current = pending.pop();
      if (!current || visited.has(current)) {
        continue;
      }

      visited.add(current);
      const neighbors = adjacencyMap.get(current) ?? [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          pending.push(neighbor);
        }
      }
    }

    const unreachableNodeIds: string[] = [];
    for (const nodeId of nodeIds) {
      if (!visited.has(nodeId)) {
        unreachableNodeIds.push(nodeId);
      }
    }

    return unreachableNodeIds;
  }
}
