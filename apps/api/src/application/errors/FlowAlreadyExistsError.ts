export class FlowAlreadyExistsError extends Error {
  constructor(flowId: string) {
    super(`Flow already exists: ${flowId}`);
    this.name = "FlowAlreadyExistsError";
  }
}
