import { Component, ElementRef, ViewChild, ViewEncapsulation, signal } from '@angular/core';
import { addEdge, Connection } from '@xyflow/react';
import { XYFlowModule } from 'ngx-xyflow';

import { FlowEdge, FlowNode, FlowNodeData, XYPosition } from '../../../../../../../packages/shared/src/contracts/flow/types';
import { NodeType } from '../../../../../../../packages/shared/src/contracts/flow/enums';

@Component({
  selector: 'app-flow-canvas',
  standalone: true,
  imports: [XYFlowModule],
  templateUrl: './flow-canvas.component.html',
  styleUrl: './flow-canvas.component.css',
  encapsulation: ViewEncapsulation.None
})
export class FlowCanvasComponent {
  @ViewChild('canvasWrapper', { static: true })
  canvasWrapper?: ElementRef<HTMLDivElement>;

  nodes = signal<FlowNode[]>([]);
  edges = signal<FlowEdge[]>([]);

  private flowInstance?: {
    screenToFlowPosition?: (point: XYPosition) => XYPosition;
    project?: (point: XYPosition) => XYPosition;
  };


  onInit(instance: unknown) {
    this.flowInstance = instance as {
      screenToFlowPosition?: (point: XYPosition) => XYPosition;
      project?: (point: XYPosition) => XYPosition;
    };
  }

  onConnect(connection: Connection) {
    this.edges.update((edges) => addEdge(connection, edges));
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    const nodeType =
      (event.dataTransfer?.getData('application/reactflow') as NodeType | undefined) ??
      (event.dataTransfer?.getData('application/xyflow') as NodeType | undefined) ??
      (event.dataTransfer?.getData('text/plain') as NodeType | undefined);
    if (!nodeType) {
      return;
    }

    const position = this.getFlowPosition(event);
  const newNode = {
    id: `node_${this.createId()}`,
    type: nodeType,
    position,
    data: this.createNodeData(nodeType)
  } as FlowNode; // Add this assertion

    this.nodes.update((nodes) => [...nodes, newNode]);
  }

  private getFlowPosition(event: DragEvent): XYPosition {
    const rect = this.canvasWrapper?.nativeElement.getBoundingClientRect();
    const x = rect ? event.clientX - rect.left : event.clientX;
    const y = rect ? event.clientY - rect.top : event.clientY;

    if (this.flowInstance?.screenToFlowPosition) {
      return this.flowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    }

    if (this.flowInstance?.project) {
      return this.flowInstance.project({ x, y });
    }

    return { x, y };
  }

  private createNodeData(type: NodeType): FlowNodeData {
    const withLabel = <T extends FlowNodeData>(data: T) =>
      ({
        ...data,
        label: data.title ?? type
      }) as FlowNodeData;

    switch (type) {
      case 'start':
        return withLabel({
          title: 'Start',
          description: 'Inicio de la conversación',
          welcomeMessage: 'Hola, ¿en qué puedo ayudarte?'
        });
      case 'router':
        return withLabel({
          title: 'Router',
          description: 'Deriva mensajes según intención',
          strategy: 'intent',
          routes: []
        });
      case 'validator':
        return withLabel({
          title: 'Validator',
          description: 'Valida entradas antes de continuar',
          rules: [],
          mode: 'all'
        });
      case 'tool':
        return withLabel({
          title: 'Tool',
          description: 'Conecta con herramientas',
          toolName: 'Nueva herramienta'
        });
      case 'agent':
        return withLabel({
          title: 'Agent',
          description: 'Agente especialista',
          instructions: 'Define las instrucciones del agente'
        });
      case 'response':
        return withLabel({
          title: 'Response',
          description: 'Mensaje final',
          messageTemplate: 'Gracias por tu consulta.'
        });
    }
  }

  private createId() {
    return Math.random().toString(36).slice(2, 9);
  }
}
