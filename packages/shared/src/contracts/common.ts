import { z } from "zod";

export const idSchema = z.string().min(1);
export const timestampSchema = z.string().min(1);
export const metadataSchema = z.record(z.string(), z.unknown());

export type Metadata = z.infer<typeof metadataSchema>;
