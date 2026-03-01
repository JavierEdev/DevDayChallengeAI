import { Component } from '@angular/core';

import { BuilderLayoutComponent } from './layout/builder-layout.component';
import { FlowToolbarComponent } from './layout/flow-toolbar.component';
import { FlowCanvasComponent } from './canvas/flow-canvas.component';
import { NodePaletteComponent } from './canvas/node-palette.component';

@Component({
  selector: 'app-flow-builder-page',
  standalone: true,
  imports: [BuilderLayoutComponent, FlowToolbarComponent, FlowCanvasComponent, NodePaletteComponent],
  templateUrl: './flow-builder.page.html',
  styleUrl: './flow-builder.page.css'
})
export class FlowBuilderPage {}
