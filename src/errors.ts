import { z } from "zod";

export const McpErrorSchema = z.object({
  code: z.string().describe("A unique error code"),
  message: z.string().describe("A human-readable error message"),
  details: z.record(z.any()).optional().describe("Additional error details"),
  action_hint: z.string().optional().describe("A hint for the next action to resolve the error"),
});
