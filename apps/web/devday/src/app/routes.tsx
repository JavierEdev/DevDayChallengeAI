import type { ReactElement } from "react";

import { BuilderPage } from "@/pages/builder/BuilderPage";

export interface AppRoute {
  path: string;
  element: ReactElement;
}

const appRoutes: AppRoute[] = [
  {
    path: "/",
    element: <BuilderPage />
  }
];

export function resolveRoute(pathname: string): AppRoute {
  return appRoutes.find((route) => route.path === pathname) ?? appRoutes[0];
}
