import { Routes } from '@angular/router';

import { FlowBuilderPage } from './flow-builder/flow-builder.page';

export const routes: Routes = [
  {
    path: '',
    component: FlowBuilderPage
  },
  {
    path: '**',
    redirectTo: ''
  }
];
