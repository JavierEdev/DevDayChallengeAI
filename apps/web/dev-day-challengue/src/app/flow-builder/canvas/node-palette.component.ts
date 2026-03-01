import { Component } from '@angular/core';
import { NodeType } from '../../../../../../../packages/shared/src/contracts/flow/enums';

interface PaletteItem {
  type: NodeType;
  label: string;
  description: string;
}

@Component({
  selector: 'app-node-palette',
  standalone: true,
  templateUrl: './node-palette.component.html',
  styleUrl: './node-palette.component.css'
})
export class NodePaletteComponent {
  palette: PaletteItem[] = [
    {
      type: 'start',
      label: 'Start',
      description: 'Punto inicial del flujo'
    },
    {
      type: 'router',
      label: 'Router',
      description: 'Deriva por intención'
    },
    {
      type: 'validator',
      label: 'Validator',
      description: 'Reglas de validación'
    },
    {
      type: 'tool',
      label: 'Tool',
      description: 'Conecta herramientas externas'
    },
    {
      type: 'agent',
      label: 'Agent',
      description: 'Agente especialista'
    },
    {
      type: 'response',
      label: 'Response',
      description: 'Respuesta final'
    }
  ];

  onDragStart(event: DragEvent, nodeType: NodeType) {
    if (!event.dataTransfer) {
      return;
    }

    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('application/xyflow', nodeType);
    event.dataTransfer.setData('text/plain', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  }
}
