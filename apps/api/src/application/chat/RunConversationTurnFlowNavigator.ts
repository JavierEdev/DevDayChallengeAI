import type { FlowDefinition, FlowNode, SessionState } from "@devday/shared";

import { TextUtils } from "../common/TextUtils.js";

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
    const normalizedMessage = TextUtils.shared.normalizeFreeText(userMessage);

    let selectedRoute: (typeof node.data.routes)[number] | null = null;
    let selectedScore = 0;
    for (const route of node.data.routes) {
      const score =
        RunConversationTurnFlowNavigator.routeMatchScore(
          route.matchValue ?? route.key,
          userMessage,
          normalizedMessage
        ) + RunConversationTurnFlowNavigator.routeIntentBonus(route, normalizedMessage);
      if (score <= 0) {
        continue;
      }

      if (!selectedRoute || score > selectedScore) {
        selectedRoute = route;
        selectedScore = score;
      }
    }

    if (selectedRoute) {
      const linkedEdge = outgoingEdges.find((edge) => edge.target === selectedRoute.targetNodeId);
      return {
        nextNodeId: selectedRoute.targetNodeId,
        edgeId: linkedEdge?.id,
        routeId: selectedRoute.id ?? selectedRoute.key,
        reason: `Router selecciono la ruta "${selectedRoute.label}" (score=${selectedScore})`
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

  private static routeMatchScore(
    matchValue: string | undefined,
    rawMessage: string,
    normalizedMessage: string
  ): number {
    if (!matchValue) {
      return 0;
    }

    const isRegexPattern = matchValue.startsWith("/") && matchValue.endsWith("/") && matchValue.length > 2;
    if (isRegexPattern) {
      try {
        const expression = new RegExp(matchValue.slice(1, -1), "i");
        return expression.test(rawMessage) ? 10 : 0;
      } catch {
        return 0;
      }
    }

    const tokens = matchValue
      .split(/[|,]/)
      .map((token) => token.trim())
      .filter(Boolean);
    if (tokens.length === 0) {
      return 0;
    }

    let score = 0;
    for (const token of tokens) {
      const normalizedToken = TextUtils.shared.normalizeFreeText(token);
      if (!normalizedToken) {
        continue;
      }

      if (normalizedToken.includes(" ")) {
        if (normalizedMessage.includes(normalizedToken)) {
          score += 2;
        }
        continue;
      }

      const boundedWordPattern = new RegExp(
        `\\b${TextUtils.shared.escapeRegExp(normalizedToken)}(?:s|es)?\\b`,
        "i"
      );
      if (boundedWordPattern.test(normalizedMessage)) {
        score += 1;
        continue;
      }

      if (normalizedMessage.includes(normalizedToken)) {
        score += 1;
      }
    }

    return score;
  }

  private static routeIntentBonus(
    route: Extract<FlowNode, { type: "router" }>["data"]["routes"][number],
    normalizedMessage: string
  ): number {
    const routeIdentity = TextUtils.shared.normalizeFreeText(
      `${route.key ?? ""} ${route.label ?? ""} ${route.id ?? ""}`
    );
    if (!routeIdentity) {
      return 0;
    }

    if (/(appointment|agenda|cita)/.test(routeIdentity)) {
      return RunConversationTurnFlowNavigator.hasAppointmentIntent(normalizedMessage) ? 3 : 0;
    }
    if (/(general|faq|pregunta)/.test(routeIdentity)) {
      return RunConversationTurnFlowNavigator.hasFaqIntent(normalizedMessage) ? 3 : 0;
    }
    if (/(catalog|vehicle|vehiculo|auto)/.test(routeIdentity)) {
      return RunConversationTurnFlowNavigator.hasCatalogIntent(normalizedMessage) ? 2 : 0;
    }

    return 0;
  }

  private static hasFaqIntent(normalizedMessage: string): boolean {
    return /(?:\bfaq\b|\bpregunta\b|\bentrega inmediata\b|\btiempo de entrega\b|\bgarantia\b|\bfinanciamiento\b|\brequisitos?\b|\benganche\b|\bplazo\b|\btasa\b|\bburo\b|\btramites?\b|\bplacas\b|\bdocumentos?\b|\bservicio\b|\bmantenimiento\b|\bpostventa\b|\bpromociones?\b)/.test(
      normalizedMessage
    );
  }

  private static hasCatalogIntent(normalizedMessage: string): boolean {
    return /(?:\bcatalogo\b|\bprecio\b|\bmodelo\b|\bcomparar\b|\bsedan\b|\bsuv\b|\bpickup\b|\bhatchback\b|\bcoupe\b|\bpresupuesto\b|\bcomprar\b|\bcotizar\b|\bcotizacion\b|\bbusco\b)/.test(
      normalizedMessage
    );
  }

  private static hasAppointmentIntent(normalizedMessage: string): boolean {
    return /(?:\bcita\b|\bagendar\b|\bagenda\b|\bprueba de manejo\b|\btest drive\b|\bdisponibilidad\b|\bhorario\b|\bfecha\b|\bhora\b)/.test(
      normalizedMessage
    );
  }
}
