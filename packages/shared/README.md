# @devday/shared

Contrato compartido del hackathon. Este paquete solo define tipos y schemas de API/runtime/flow.

## Import recomendado

```ts
import {
  flowDefinitionSchema,
  createSessionRequestSchema,
  sendMessageResponseSchema,
  type FlowDefinition,
  type SessionState
} from "@devday/shared";
```

## Secciones

- `contracts/flow/*`: modelo de flujo visual (`FlowDefinition`, `FlowNode`, `FlowEdge`, `NodeType`).
- `contracts/runtime/*`: estado de sesión/ejecución (`SessionState`, `ExecutionState`, `RuntimeStatus`, `TraceEvent`).
- `contracts/api/*`: request/response del backend (`CreateSession*`, `SendMessage*`, `ValidateFlowResponse`).
