import { z } from "zod";
import {
  SUB_PROJECT_STATUS_VALUES,
  SUB_PROJECT_PRIORITY_VALUES,
} from "@/types";

const ISODateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;

export const CreateSubProjectSchema = z
  .object({
    projectId: z.string().uuid("Invalid project ID"),
    name: z.string().min(1).max(120),
    nameTh: z.string().max(120).nullable().optional(),
    icon: z.string().optional(),
    leadId: z.string().uuid().nullable().optional(),
    teamIds: z.array(z.string().uuid()).optional(),
    status: z
      .enum(SUB_PROJECT_STATUS_VALUES as [string, ...string[]])
      .optional(),
    priority: z
      .enum(SUB_PROJECT_PRIORITY_VALUES as [string, ...string[]])
      .optional(),
    due: z
      .string()
      .regex(ISODateOnlyRegex, "Date must be YYYY-MM-DD")
      .nullable()
      .optional(),
    progress: z.number().int().min(0).max(100).optional(),
    quarter: z.string().max(100).nullable().optional(),
    tags: z.array(z.string().min(1).max(50)).optional(),
  })
  .strict();

export const UpdateSubProjectSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    nameTh: z.string().max(120).nullable().optional(),
    icon: z.string().optional(),
    leadId: z.string().uuid().nullable().optional(),
    teamIds: z.array(z.string().uuid()).optional(),
    status: z
      .enum(SUB_PROJECT_STATUS_VALUES as [string, ...string[]])
      .optional(),
    priority: z
      .enum(SUB_PROJECT_PRIORITY_VALUES as [string, ...string[]])
      .optional(),
    due: z
      .string()
      .regex(ISODateOnlyRegex, "Date must be YYYY-MM-DD")
      .nullable()
      .optional(),
    progress: z.number().int().min(0).max(100).optional(),
    quarter: z.string().max(100).nullable().optional(),
    tags: z.array(z.string().min(1).max(50)).optional(),
    position: z.number().int().min(1).optional(),
  })
  .strict();

export const ReorderSubProjectSchema = z
  .object({
    targetProjectId: z.string().uuid("Invalid project ID"),
    position: z.number().int().min(1),
  })
  .strict();

export const AddSubProjectMemberSchema = z
  .object({
    userId: z.string().uuid("Invalid user ID"),
  })
  .strict();

export type CreateSubProjectSchemaType = z.infer<typeof CreateSubProjectSchema>;
export type UpdateSubProjectSchemaType = z.infer<typeof UpdateSubProjectSchema>;
export type ReorderSubProjectSchemaType = z.infer<
  typeof ReorderSubProjectSchema
>;
export type AddSubProjectMemberSchemaType = z.infer<
  typeof AddSubProjectMemberSchema
>;
