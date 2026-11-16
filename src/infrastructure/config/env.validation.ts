// Validates environment variables once, at startup.
// Why: a missing or wrong variable should stop the app immediately with a clear
// message, instead of failing later deep inside a database call.
// Hand-written instead of a schema library: only a few variables, nothing to hide.

export interface Env {
  DATABASE_URL: string;
  PORT: number;
}

export function validateEnv(raw: Record<string, unknown>): Env {
  const errors: string[] = [];

  const databaseUrl = raw.DATABASE_URL;
  if (typeof databaseUrl !== 'string' || databaseUrl.trim() === '') {
    errors.push('DATABASE_URL is required (see .env.example)');
  }

  const portRaw = raw.PORT ?? '3000';
  const port = Number(portRaw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    errors.push(
      `PORT must be an integer between 1 and 65535, got ${JSON.stringify(portRaw)}`,
    );
  }

  if (errors.length > 0) {
    throw new Error(
      `Invalid environment configuration:\n- ${errors.join('\n- ')}`,
    );
  }

  return { DATABASE_URL: databaseUrl as string, PORT: port };
}
