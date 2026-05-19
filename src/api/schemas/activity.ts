import { z } from "zod";
import { ACTIVITY_TYPE_VALUES } from "@/types";

const ISODateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;

export const CreateActivitySchema = z
  .object({
    subProjectId: z.string().uuid("Invalid sub-project ID"),
    type: z.enum(ACTIVITY_TYPE_VALUES as [string, ...string[]]),
    title: z.string().min(1).max(200),
    body: z.string().max(2000).nullable().optional(),
    occursAt: z.string().datetime({ message: "occursAt must be an ISO date-time string" }),
  })
  .strict();

export const UpdateActivitySchema = z
  .object({
    type: z.enum(ACTIVITY_TYPE_VALUES as [string, ...string[]]).optional(),
    title: z.string().min(1).max(200).optional(),
    body: z.string().max(2000).nullable().optional(),
    occursAt: z
      .string()
      .datetime({ message: "occursAt must be an ISO date-time string" })
      .optional(),
  })
  .strict();

export const ListActivitiesQuerySchema = z
  .object({
    from: z
      .string()
      .regex(ISODateOnlyRegex, "from must be YYYY-MM-DD")
      .optional(),
    to: z
      .string()
      .regex(ISODateOnlyRegex, "to must be YYYY-MM-DD")
      .optional(),
  })
  .strict();

export type CreateActivitySchemaType = z.infer<typeof CreateActivitySchema>;
export type UpdateActivitySchemaType = z.infer<typeof UpdateActivitySchema>;
export type ListActivitiesQuerySchemaType = z.infer<
  typeof ListActivitiesQuerySchema
>;
