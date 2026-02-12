import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "./config.js";

async function main() {
  const apiKey = config.OPTIMIZER_API_KEY || config.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("No API key found in OPTIMIZER_API_KEY or GEMINI_API_KEY");
    process.exit(1);
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // dummy model just to get access to listModels function if possible? can listModels be called on genAI? No.
    // Actually listModels is not on genAI directly? No, wait.
    
    // Ah, SDK docs say: 
    // genAI.getGenerativeModel({ model: "..." }) returns a model.
    // To list models, we might need to use the REST API manually or see if the SDK supports it.
    // Looking at SDK docs (which I can't browse), usually it's `genAI.getGenerativeModelResponse`? No.
    // The user's error says "Call ListModels".

    // Let's try to run a simple generateContent with "gemini-1.5-flash" and see if it works, or catch the error.
    // Wait, the user already did that and got an error.

    // Let's try 'gemini-1.5-pro-latest' or 'gemini-1.5-flash-latest' or 'gemini-1.0-pro'.

    const modelsToTry = [
      "gemini-1.5-flash", 
      "gemini-1.5-flash-latest",
      "gemini-1.5-pro",
      "gemini-1.5-pro-latest",
      "gemini-1.0-pro",
      "gemini-pro"
    ];

    for (const modelName of modelsToTry) {
      console.log(`Trying model: ${modelName}`);
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Hello, are you there?");
        const response = await result.response;
        console.log(`Successfully used model: ${modelName}`);
        console.log("Response:", response.text());
        break; // Stop after first success
      } catch (e: any) {
        console.error(`Failed with model ${modelName}: ${e.message}`);
      }
    }

  } catch (error) {
    console.error("Error checking models:", error);
  }
}

main();
