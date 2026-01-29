import { z } from "zod";

// Example Zod validations
// These can be used on both backend and frontend

export const userSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(2, "Name must be at least 2 characters"),
});

export const licenseSchema = z.object({
  key: z.string().min(16, "License key must be at least 16 characters"),
  productId: z.string().uuid("Invalid product ID"),
  expiresAt: z.string().datetime().optional(),
});

export const createUserSchema = userSchema;

export const updateUserSchema = userSchema.partial();

// Type inference from schemas
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type LicenseInput = z.infer<typeof licenseSchema>;
