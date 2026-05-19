import { z } from "zod";
import { USER_ROLE_VALUES, USER_STATUS_VALUES } from "@/types";

export const InviteUserSchema = z
  .object({
    email: z.string().email("Invalid email format"),
    name: z.string().min(1).max(120),
    nameTh: z.string().max(120).optional(),
    role: z.enum(USER_ROLE_VALUES as [string, ...string[]]),
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a hex like #7C5CFF")
      .optional(),
    password: z.string().min(8, "Password must be at least 8 characters"),
  })
  .strict();

export const UpdateUserSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    nameTh: z.string().max(120).optional(),
    role: z.enum(USER_ROLE_VALUES as [string, ...string[]]).optional(),
    status: z.enum(USER_STATUS_VALUES as [string, ...string[]]).optional(),
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .optional(),
  })
  .strict();

export type InviteUserSchemaType = z.infer<typeof InviteUserSchema>;
export type UpdateUserSchemaType = z.infer<typeof UpdateUserSchema>;
