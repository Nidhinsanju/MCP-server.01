import OpenAI from "openai";
import { config } from "../config.js";

const openai = new OpenAI({
  apiKey: config.EXECUTION_API_KEY || config.OPENAI_API_KEY,
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
