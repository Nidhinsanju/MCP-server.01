import puppeteer from 'puppeteer';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../config.js";
import fs from 'fs';

const genAI = new GoogleGenerativeAI(config.OPTIMIZER_API_KEY || config.GEMINI_API_KEY || "");

function fileToGenerativePart(path: string, mimeType: string) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(path)).toString("base64"),
      mimeType
    },
  };
}

export async function captureScreenshot(url: string, outputPath: string = 'screenshot.png'): Promise<string> {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(url, { waitUntil: 'networkidle2' });
    await page.screenshot({ path: outputPath, fullPage: true });
    return outputPath;
  } catch (error) {
    console.error("Error capturing screenshot:", error);
    throw error;
  } finally {
    if (browser) await browser.close();
  }
}

export async function convertImageToCode(imagePath: string, framework: string = "React + Tailwind", modelName?: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: modelName || "gemini-2.5-flash" });
    const prompt = `Convert this UI screenshot into clean, production-ready ${framework} code. ensure that you create a modern premium look.`;
    const imagePart = fileToGenerativePart(imagePath, "image/png");

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error converting image to code:", error);
    return `Error converting image to code: ${error instanceof Error ? error.message : String(error)}`;
  }
}
