
import type { ReactNode } from "react";

interface NodeCardProps {
  variant: string;
  selected: boolean;
  eyebrow: string;
  title: string;
  summary: string;
  children?: ReactNode;
};

export type { NodeCardProps };
