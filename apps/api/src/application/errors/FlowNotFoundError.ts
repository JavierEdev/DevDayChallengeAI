export class FlowNotFoundError extends Error {
  constructor(flowId: string) {
    super(`Flow not found: ${flowId}`);
    this.name = "FlowNotFoundError";
  }
}
