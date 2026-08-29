import pino from "pino";

export const logger = pino({
  name: "arete",
  level: process.env.LOG_LEVEL ?? "info",
  redact: {
    paths: [
      "password",
      "token",
      "accessToken",
      "refreshToken",
      "authorization",
      "headers.authorization",
      "*.secret",
      "*.apiKey"
    ],
    censor: "[REDACTED]"
  }
});

export type RequestLogContext = {
  requestId: string;
  schoolId?: string;
  userId?: string;
};
