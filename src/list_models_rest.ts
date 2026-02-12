import { config } from "./config.js";
import https from "https";

export async function listAvailableModels(): Promise<string> {
  const apiKey = config.GEMINI_API_KEY || config.OPTIMIZER_API_KEY; // Prefer GEMINI_API_KEY for general model listing

  if (!apiKey) {
    return "Error: No API key found for listing models (GEMINI_API_KEY or OPTIMIZER_API_KEY).";
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.models) {
            const formattedModels = json.models
              .map((m: any) => `- ${m.name} (${m.displayName})`)
              .join('\n');
            resolve("Available models:\n" + formattedModels);
          } else {
            resolve("No models found or error response: " + JSON.stringify(json, null, 2));
          }
        } catch (e) {
          reject("Error parsing JSON: " + (e instanceof Error ? e.message : String(e)) + "\nRaw response: " + data);
        }
      });
    }).on('error', (e) => {
      reject("Request error: " + (e instanceof Error ? e.message : String(e)));
    });
  });
}
