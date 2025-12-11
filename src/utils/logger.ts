type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: Record<string, unknown>;
}

function formatLog(entry: LogEntry): string {
  const base = `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${
    entry.message
  }`;
  if (entry.data) {
    return `${base} ${JSON.stringify(entry.data)}`;
  }
  return base;
}

function log(
  level: LogLevel,
  message: string,
  data?: Record<string, unknown>
): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    data,
  };

  const formatted = formatLog(entry);

  switch (level) {
    case "error":
      console.error(formatted);
      break;
    case "warn":
      console.warn(formatted);
      break;
    default:
      console.log(formatted);
  }
}

export const logger = {
  debug: (message: string, data?: Record<string, unknown>) =>
    log("debug", message, data),
  info: (message: string, data?: Record<string, unknown>) =>
    log("info", message, data),
  warn: (message: string, data?: Record<string, unknown>) =>
    log("warn", message, data),
  error: (message: string, data?: Record<string, unknown>) =>
    log("error", message, data),

  // 专门用于记录图片生成
  logGeneration: (params: {
    userId: string;
    username: string;
    prompt: string;
    model: string;
    seed: number;
    success: boolean;
    error?: string;
  }) => {
    log("info", "Image generation", {
      userId: params.userId,
      username: params.username,
      prompt: params.prompt,
      model: params.model,
      seed: params.seed,
      success: params.success,
      ...(params.error && { error: params.error }),
    });
  },

  // 专门用于记录翻译请求
  logTranslation: (params: {
    userId: string;
    username: string;
    input: string;
    output: string;
    success: boolean;
    error?: string;
  }) => {
    log("info", "Tag translation", {
      userId: params.userId,
      username: params.username,
      input: params.input,
      output: params.output,
      success: params.success,
      ...(params.error && { error: params.error }),
    });
  },
};
