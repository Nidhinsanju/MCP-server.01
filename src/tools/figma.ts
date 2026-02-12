
import axios from 'axios';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../config.js";

const genAI = new GoogleGenerativeAI(config.OPTIMIZER_API_KEY || config.GEMINI_API_KEY || "");
// const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Potentially problematic

async function getFigmaImage(fileKey: string, nodeId: string, accessToken: string): Promise<string> {
  try {
    const response = await axios.get(`https://api.figma.com/v1/images/${fileKey}?ids=${nodeId}&format=png`, {
      headers: { 'X-Figma-Token': accessToken }
    });
    const imageUrl = response.data.images[nodeId];
    return imageUrl;
  } catch (error) {
    console.error("Error fetching Figma image:", error);
    throw error;
  }
}

async function urlToGenerativePart(url: string, mimeType: string) {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return {
      inlineData: {
        data: Buffer.from(response.data).toString("base64"),
        mimeType
      },
    };
}

export async function convertFigmaToCode(fileKey: string, nodeId: string, accessToken: string, framework: string = "React + Tailwind", modelName?: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: modelName || "gemini-2.5-flash" });
    
    const imageUrl = await getFigmaImage(fileKey, nodeId, accessToken);
    if (!imageUrl) throw new Error("Could not retrieve image URL for the specified node.");

    const prompt = `Convert this Figma design into clean, pixel-perfect ${framework} code. ensure that you create a modern premium look.`;
    const imagePart = await urlToGenerativePart(imageUrl, "image/png");

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error converting Figma to code:", error);
    return `Error converting Figma to code: ${error instanceof Error ? error.message : String(error)}`;
  }
}
