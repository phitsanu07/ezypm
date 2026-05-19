import { z } from "zod";

export const CreateBoardSchema = z
  .object({
    name: z.string().min(1).max(120),
    nameTh: z.string().max(120).nullable().optional(),
    icon: z.string().optional(),
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a hex color like #7C5CFF")
      .optional(),
    memberIds: z.array(z.string().uuid()).optional(),
  })
  .strict();

export const UpdateBoardSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    nameTh: z.string().max(120).nullable().optional(),
    icon: z.string().optional(),
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a hex color like #7C5CFF")
      .optional(),
  })
  .strict();

export const AddBoardMemberSchema = z
  .object({
    userId: z.string().uuid("Invalid user ID format"),
  })
  .strict();

export type CreateBoardSchemaType = z.infer<typeof CreateBoardSchema>;
export type UpdateBoardSchemaType = z.infer<typeof UpdateBoardSchema>;
export type AddBoardMemberSchemaType = z.infer<typeof AddBoardMemberSchema>;
