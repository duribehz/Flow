import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  WEB_ORIGIN: z.url().default("http://localhost:5173"),
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive(),
  DB_USERNAME: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_DATABASE: z.string().min(1),
});

export interface AppConfig {
  environment: "development" | "test" | "production";
  port: number;
  webOrigin: string;
  database: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
    ssl: false | { rejectUnauthorized: false };
  };
}

export function loadConfig(environment: NodeJS.ProcessEnv): AppConfig {
  const result = environmentSchema.safeParse(environment);

  if (!result.success) {
    throw new Error(`Invalid environment:\n${z.prettifyError(result.error)}`);
  }

  const env = result.data;

  return {
    environment: env.NODE_ENV,
    port: env.PORT,
    webOrigin: env.WEB_ORIGIN,
    database: {
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USERNAME,
      password: env.DB_PASSWORD,
      database: env.DB_DATABASE,
      ssl: env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    },
  };
}
