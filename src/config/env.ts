import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  CLIENT_ORIGIN: z.string().url().default('http://localhost:4200'),
  SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(168).default(12),
  SCHOOL_TIMEZONE: z.string().default('Asia/Jakarta'),
  LATE_AFTER: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default('07:15'),
  EARLY_CHECKOUT_BEFORE: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default('17:00'),
});

export const env = envSchema.parse(process.env);
