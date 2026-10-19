import pino from "pino";
import pretty from "pino-pretty";

const isDev = process.env.NODE_ENV === "development";

const stream = isDev ? pretty({ colorize: true }) : undefined;

export const logger = pino(
  {
    level: process.env.LOG_LEVEL || (isDev ? "debug" : "info"),
    redact: {
      paths: [
        "password",
        "token",
        "otp",
        "secret",
        "aadhaar",
        "phone",
        "email",
        "address",
        "guardianPhone",
        "*.password",
        "*.token",
        "*.otp",
        "*.secret",
        "*.aadhaar",
        "*.phone",
        "*.email",
        "*.address",
        "*.guardianPhone",
      ],
      censor: "[REDACTED]",
    },
    transport: isDev
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            ignore: "pid,hostname",
            translateTime: "SYS:standard",
          },
        }
      : undefined,
  },
  stream
);
