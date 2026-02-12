import OpenAI from "openai";
import { config } from "../config.js";

const apiKey = config.EXECUTION_API_KEY || config.OPENAI_API_KEY;

if (!apiKey) {
  throw new Error("Execution API key is missing. Please set EXECUTION_API_KEY or OPENAI_API_KEY in your environment.");
}

const openai = new OpenAI({
  apiKey: apiKey,
});

export async function executePrompt(prompt: string, model: string = "gpt-4o"): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: model,
      messages: [{ role: "user", content: prompt }],
    });

    return response.choices[0]?.message?.content || "No response generated.";
  } catch (error) {
    console.error("Error executing prompt:", error);
    return `Error executing prompt: ${error instanceof Error ? error.message : String(error)}`;
  }
}
