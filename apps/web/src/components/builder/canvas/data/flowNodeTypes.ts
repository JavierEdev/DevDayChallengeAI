import { GenericNode } from "../nodes/GenericNode";
import { MemoryNode } from "../nodes/MemoryNode";
import { OrchestratorNode } from "../nodes/OrchestratorNode";
import { SpecialistNode } from "../nodes/SpecialistNode";
import { StartNode } from "../nodes/StartNode";
import { ToolNode } from "../nodes/ToolNode";
import { ValidatorNode } from "../nodes/ValidatorNode";

const flowNodeTypes = {
  start: StartNode,
  memory: MemoryNode,
  orchestrator: OrchestratorNode,
  validator: ValidatorNode,
  specialist: SpecialistNode,
  generic: GenericNode,
  tool: ToolNode
};

export { flowNodeTypes };
