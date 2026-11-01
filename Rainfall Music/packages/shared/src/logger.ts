import winston from 'winston';
import { config } from '@rainfall/config';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

const customConsoleFormat = printf(({ level, message, timestamp, stack, context }) => {
  const contextStr = context ? ` [${context}]` : '';
  const logMessage = stack || message;
  return `${timestamp} ${level}${contextStr}: ${logMessage}`;
});

export const logger = winston.createLogger({
  level: config.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    config.NODE_ENV === 'production' ? json() : combine(colorize(), customConsoleFormat)
  ),
  defaultMeta: { service: 'rainfall-ecosystem' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

export function createScopedLogger(context: string) {
  return {
    info: (msg: string, meta?: Record<string, unknown>) => logger.info(msg, { context, ...meta }),
    warn: (msg: string, meta?: Record<string, unknown>) => logger.warn(msg, { context, ...meta }),
    error: (msg: string, error?: unknown, meta?: Record<string, unknown>) => {
      if (error instanceof Error) {
        logger.error(msg, { context, stack: error.stack, message: error.message, ...meta });
      } else {
        logger.error(msg, { context, error, ...meta });
      }
    },
    debug: (msg: string, meta?: Record<string, unknown>) => logger.debug(msg, { context, ...meta }),
  };
}

