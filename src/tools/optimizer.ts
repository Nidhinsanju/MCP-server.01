import { GoogleGenerativeAI } from "@google/generative-ai";
import { config, MODELS } from "../config.js";

const genAI = new GoogleGenerativeAI(config.OPTIMIZER_API_KEY || config.GEMINI_API_KEY || "");

export async function optimizePrompt(userPrompt: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: MODELS.OPTIMIZER });

    const systemInstruction = `
    You are an expert Prompt Engineer. Your goal is to rewrite the given user prompt to be:
    1. Clear and unambiguous.
    2. Concise (remove filler words to save tokens).
    3. Structured for an LLM to understand better.
    4. Maintain the original intent and requirements.

    Output ONLY the optimized prompt. Do not add any conversational text.
    `;

    const result = await model.generateContent([
      systemInstruction,
      `User Prompt: ${userPrompt}`,
    ]);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error optimizing prompt:", error);
    // Fallback to gemini-2.0-flash if primary model fails
    try {
        console.log("Retrying with gemini-pro...");
        const fallbackModel = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await fallbackModel.generateContent([
            `System: You are an expert Prompt Engineer. Rewrite this prompt to be concise and clear. Output ONLY the optimized prompt.`,
            `User Prompt: ${userPrompt}`,
        ]);
        return (await result.response).text();
    } catch (fallbackError) {
        return `Error optimizing prompt: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
}
