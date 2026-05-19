import { z } from "zod";
import { PROJECT_TYPE_VALUES } from "@/types";

export const CreateProjectSchema = z
  .object({
    boardId: z.string().uuid("Invalid board ID"),
    name: z.string().min(1).max(120),
    nameTh: z.string().max(120).nullable().optional(),
    icon: z.string().optional(),
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .optional(),
    type: z.enum(PROJECT_TYPE_VALUES as [string, ...string[]]).optional(),
  })
  .strict();

export const UpdateProjectSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    nameTh: z.string().max(120).nullable().optional(),
    icon: z.string().optional(),
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .optional(),
    type: z.enum(PROJECT_TYPE_VALUES as [string, ...string[]]).optional(),
    position: z.number().int().min(1).optional(),
  })
  .strict();

export type CreateProjectSchemaType = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectSchemaType = z.infer<typeof UpdateProjectSchema>;
