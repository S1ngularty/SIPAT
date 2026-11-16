import { z } from "zod";

/**
 * Body accepted when a freshly authenticated Clerk user is persisted.
 *
 * Only non-sensitive profile data is allowed through. Credentials (password,
 * tokens, ...) live in Clerk and must never reach this API or the database.
 * `role` is pinned to `"user"` so a client cannot self-assign `admin`; the
 * server also ignores it and always creates accounts with the default role.
 */
export const signupSchema = z.object({
  email: z.email("Invalid email address"),
  name: z.string().trim().min(2).max(100).optional(),
  role: z.literal("user").optional(),
});

export const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100)
    .optional(),
  phoneNumber: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s()]+$/, "Invalid phone number format")
    .optional(),
  farmLocation: z
    .object({
      province: z.string().trim().min(1).max(100).optional(),
      municipality: z.string().trim().min(1).max(100).optional(),
      barangay: z.string().trim().min(1).max(100).optional(),
    })
    .optional(),
  preferredCrops: z
    .array(z.enum(["tomato", "eggplant", "pepper", "potato"]))
    .max(6, "Maximum 6 crops allowed")
    .optional(),
});

export const updatePreferredCropsSchema = z.object({
  preferredCrops: z
    .array(z.enum(["tomato", "eggplant", "pepper", "potato"]))
    .min(1, "At least one crop required")
    .max(6, "Maximum 6 crops allowed"),
});

export const updateRoleSchema = z.object({
  role: z.enum(["user", "admin"]),
});

export const userIdParamSchema = z.object({
  userId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid user ID"),
});

export const getUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
  sortBy: z
    .enum(["createdAt", "updatedAt", "name", "email"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  role: z.enum(["user", "admin"]).optional(),
  isActive: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .optional(),
  province: z.string().optional(),
  municipality: z.string().optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdatePreferredCropsInput = z.infer<
  typeof updatePreferredCropsSchema
>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type GetUsersQuery = z.infer<typeof getUsersQuerySchema>;
