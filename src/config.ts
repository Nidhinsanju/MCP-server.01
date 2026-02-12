import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const configSchema = z.object({
  OPTIMIZER_API_KEY: z.string().optional(),
  EXECUTION_API_KEY: z.string().optional(),
  FIGMA_ACCESS_TOKEN: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(), // Fallback or primary
  GEMINI_API_KEY: z.string().optional(), // Fallback or primary
});

export const config = configSchema.parse(process.env);

export const MODELS = {
  OPTIMIZER: 'gemini-2.5-flash', // Cost-effective
  EXECUTOR: 'gpt-4o', // Premium, capable
};
