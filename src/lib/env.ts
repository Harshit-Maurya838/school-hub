import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().optional(),
  APP_SECRET: z.string().min(32, "APP_SECRET must be at least 32 characters long"),
  RESEND_API_KEY: z.preprocess(
    (val) => (typeof val === "string" && val.trim() !== "" ? val.trim() : undefined),
    z.string().optional()
  ),
  EMAIL_FROM: z.preprocess(
    (val) => (typeof val === "string" && val.trim() !== "" ? val.trim() : undefined),
    z.string().default("CampusPulse <onboarding@resend.dev>")
  ),
  APP_URL: z.preprocess(
    (val) =>
      typeof val === "string" && val.trim() !== "" ? val.trim() : process.env.APP_URL || undefined,
    z.string().url().default("http://localhost:3000")
  ),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errorDetails = result.error.format();
    throw new Error(`Invalid environment variables: ${JSON.stringify(errorDetails, null, 2)}`);
  }

  return result.data;
}

export const env = validateEnv();
