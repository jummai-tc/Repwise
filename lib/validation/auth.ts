import { z } from "zod";

export const signUpSchema = z.object({
  full_name: z.string().trim().min(2, "Please enter your name").max(80),
  email: z.email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Use at least 8 characters")
    .max(72, "Passwords cannot be longer than 72 characters"),
});

export const signInSchema = z.object({
  email: z.email("Please enter a valid email address"),
  password: z.string().min(1, "Please enter your password"),
});
