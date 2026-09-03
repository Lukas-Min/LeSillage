import { z } from "zod";

const optionalString = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? undefined : value))
  .optional();

const baseSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_PORT: z
    .string()
    .regex(/^[0-9]{2,5}$/, "APP_PORT must be a numeric port")
    .default("3030"),
  APP_URL: z.string().url().default("http://localhost:3030"),
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required (Supabase project → Settings → Database)"),
  DATABASE_DIRECT_URL: optionalString,
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  AUTH_URL: optionalString,
  ADMIN_PASSWORD: z
    .string()
    .min(6, "ADMIN_PASSWORD must be at least 6 characters")
    .regex(/[0-9]/, "ADMIN_PASSWORD must contain at least one digit"),
  GMAIL_USER: z.string().email().default("le.sillage.mnl@gmail.com"),
  GMAIL_APP_PASSWORD: z.string().min(8, "GMAIL_APP_PASSWORD is required"),
  ADMIN_EMAIL: z.string().email().default("le.sillage.mnl@gmail.com"),
  NEXT_PUBLIC_SUPABASE_URL: optionalString,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalString,
  SUPABASE_SERVICE_ROLE_KEY: optionalString,
  GOOGLE_CLIENT_ID: optionalString,
  GOOGLE_CLIENT_SECRET: optionalString,
  FACEBOOK_CLIENT_ID: optionalString,
  FACEBOOK_CLIENT_SECRET: optionalString,
  BLOB_READ_WRITE_TOKEN: optionalString,
  BLOB_BASE_URL: optionalString,
});

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3030"),
  NEXT_PUBLIC_PHONE: z.string().optional(),
  NEXT_PUBLIC_PICKUP_NOTES: z.string().optional(),
});

type Env = z.infer<typeof baseSchema> & z.infer<typeof clientSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = baseSchema.safeParse(process.env);
  const clientParsed = clientSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  if (!clientParsed.success) {
    const issues = clientParsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid public environment variables:\n${issues}`);
  }
  cached = { ...parsed.data, ...clientParsed.data };
  return cached;
}

export function requireEnv<K extends keyof Env>(key: K): Env[K] {
  return getEnv()[key];
}
