import type { FlowDefinition, FlowNode, SessionState } from "@devday/shared";

export interface INextNodeSelection {
  nextNodeId: string | null;
  edgeId?: string | undefined;
}

export interface IRouterSelection extends INextNodeSelection {
  routeId?: string | undefined;
  reason?: string | undefined;
}

export class RunConversationTurnFlowNavigator {
  static buildNodeMap(flowDefinition: FlowDefinition): Map<string, FlowNode> {
    return new Map(flowDefinition.nodes.map((node) => [node.id, node]));
  }

  static resolveStartingNodeId(
    sessionState: SessionState,
    flowDefinition: FlowDefinition,
    nodeMap: Map<string, FlowNode>
  ): string {
    if (sessionState.execution.nextNodeId && nodeMap.has(sessionState.execution.nextNodeId)) {
      return sessionState.execution.nextNodeId;
    }
    return flowDefinition.startNodeId;
  }

  static selectNextNode(flowDefinition: FlowDefinition, sourceNodeId: string): INextNodeSelection {
    const outgoingEdges = flowDefinition.edges.filter((edge) => edge.source === sourceNodeId);
    const preferredEdge =
      outgoingEdges.find((edge) => edge.kind === "default") ?? outgoingEdges[0];
    if (!preferredEdge) {
      return { nextNodeId: null };
    }

    return {
      nextNodeId: preferredEdge.target,
      edgeId: preferredEdge.id
    };
  }

  static selectSpecificNextNode(
    flowDefinition: FlowDefinition,
    sourceNodeId: string,
    targetNodeId: string
  ): INextNodeSelection {
    const selectedEdge = flowDefinition.edges.find(
      (edge) => edge.source === sourceNodeId && edge.target === targetNodeId
    );
    if (!selectedEdge) {
      return { nextNodeId: null };
    }

    return {
      nextNodeId: selectedEdge.target,
      edgeId: selectedEdge.id
    };
  }

  static selectRouterTarget(
    flowDefinition: FlowDefinition,
    node: Extract<FlowNode, { type: "router" }>,
    userMessage: string
  ): IRouterSelection {
    const outgoingEdges = flowDefinition.edges.filter((edge) => edge.source === node.id);
    const normalizedMessage = userMessage.toLowerCase();

    for (const route of node.data.routes) {
      if (!RunConversationTurnFlowNavigator.matchesRoute(route.matchValue ?? route.key, normalizedMessage)) {
        continue;
      }

      const linkedEdge = outgoingEdges.find((edge) => edge.target === route.targetNodeId);
      return {
        nextNodeId: route.targetNodeId,
        edgeId: linkedEdge?.id,
        routeId: route.id ?? route.key,
        reason: `Router selecciono la ruta "${route.label}"`
      };
    }

    if (node.data.fallbackNodeId) {
      const fallbackEdge = outgoingEdges.find((edge) => edge.target === node.data.fallbackNodeId);
      return {
        nextNodeId: node.data.fallbackNodeId,
        edgeId: fallbackEdge?.id,
        reason: "Router uso fallbackNodeId"
      };
    }

    const fallbackEdge = outgoingEdges.find((edge) => edge.kind === "fallback");
    if (fallbackEdge) {
      return {
        nextNodeId: fallbackEdge.target,
        edgeId: fallbackEdge.id,
        reason: "Router uso edge fallback"
      };
    }

    const defaultEdge = outgoingEdges[0];
    if (defaultEdge) {
      return {
        nextNodeId: defaultEdge.target,
        edgeId: defaultEdge.id,
        reason: "Router uso la primera salida disponible"
      };
    }

    return { nextNodeId: null };
  }

  private static matchesRoute(matchValue: string | undefined, normalizedMessage: string): boolean {
    if (!matchValue) {
      return false;
    }

    const isRegexPattern = matchValue.startsWith("/") && matchValue.endsWith("/") && matchValue.length > 2;
    if (isRegexPattern) {
      try {
        const expression = new RegExp(matchValue.slice(1, -1), "i");
        return expression.test(normalizedMessage);
      } catch {
        return false;
      }
    }

    const tokens = matchValue
      .toLowerCase()
      .split(/[|,]/)
      .map((token) => token.trim())
      .filter(Boolean);

    return tokens.some((token) => normalizedMessage.includes(token));
  }
}
