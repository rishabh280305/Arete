import { z } from "@arete/validation";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  OPENAI_API_KEY: z.string().optional(),
  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  GOOGLE_CLASSROOM_CLIENT_ID: z.string().optional(),
  GOOGLE_CLASSROOM_CLIENT_SECRET: z.string().optional(),
  MICROSOFT_GRAPH_CLIENT_ID: z.string().optional(),
  MICROSOFT_GRAPH_CLIENT_SECRET: z.string().optional(),
  SENTRY_DSN: z.string().optional()
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return envSchema.parse(env);
}
