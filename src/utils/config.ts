import "dotenv/config";

interface Config {
  discord: {
    token: string;
    clientId: string;
    adminIds: string[];
  };
  novelai: {
    apiKey: string;
    baseUrl: string;
    limitMode: boolean;
  };
  llm: {
    apiKey: string;
    baseUrl: string;
    model: string;
  };
  rateLimit: {
    requestsPerMinute: number;
  };
}

function getEnvOrThrow(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getEnvOrDefault(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  const normalized = value.toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function getEnvList(key: string): string[] {
  const value = process.env[key];
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export const config: Config = {
  discord: {
    token: getEnvOrThrow("DISCORD_TOKEN"),
    clientId: getEnvOrThrow("CLIENT_ID"),
    adminIds: getEnvList("ADMIN_USER_IDS"),
  },
  novelai: {
    apiKey: getEnvOrThrow("NAI_API_KEY"),
    baseUrl: getEnvOrDefault("NAI_BASE_URL", "https://image.novelai.net"),
    limitMode: getEnvBoolean("NAI_LIMIT_MODE", false),
  },
  llm: {
    apiKey: getEnvOrThrow("LLM_API_KEY"),
    baseUrl: getEnvOrDefault("LLM_BASE_URL", "https://api.openai.com/v1"),
    model: getEnvOrDefault("LLM_MODEL", "gpt-4o-mini"),
  },
  rateLimit: {
    requestsPerMinute: Number(getEnvOrDefault("RATE_LIMIT_PER_MIN", "3")),
  },
};
