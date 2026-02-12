
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { optimizePrompt } from "./tools/optimizer.js";
import { executePrompt } from "./tools/executor.js";
import { captureScreenshot, convertImageToCode } from "./tools/vision.js";
import { convertFigmaToCode } from "./tools/figma.js";
import { readFile, writeFile, listDirectory } from "./tools/filesystem.js";
import { requestFileWrite, requestShellCommand, listPendingActions, approveAction, rejectAction } from "./tools/review.js";
import { listAvailableModels } from "./list_models_rest.js"; // Import the new function

const server = new McpServer({
  name: "custom-ai-mcp",
  version: "1.0.0",
});

let currentVisionModel: string | undefined = undefined;

// --- AI & Optimization Tools ---

server.tool(
  "optimize_prompt",
  "Refines a user prompt to be more efficient and clear for LLMs.",
  { prompt: z.string().describe("The user prompt to optimize") },
  async ({ prompt }) => {
    const optimized = await optimizePrompt(prompt);
    return { content: [{ type: "text", text: optimized }] };
  }
);

server.tool(
  "execute_model",
  "Executes a prompt using a specified AI model (default: gpt-4o).",
  {
    prompt: z.string().describe("The prompt to execute"),
    model: z.string().optional().describe("The model to use (default: gpt-4o)"),
  },
  async ({ prompt, model }) => {
    const result = await executePrompt(prompt, model);
    return { content: [{ type: "text", text: result }] };
  }
);

server.tool(
  "smart_ask",
  "Optimizes the prompt first, then executes it with a premium model.",
  { prompt: z.string().describe("The user prompt") },
  async ({ prompt }) => {
    const optimized = await optimizePrompt(prompt);
    const result = await executePrompt(optimized);
    return {
      content: [
        { type: "text", text: `Optimized Prompt: ${optimized}\n\nResult:\n${result}` },
      ],
    };
  }
);

server.tool(
  "set_vision_model",
  "Sets the model to be used for vision (image-to-code) tasks.",
  {
    model_name: z.string().describe("The name of the vision model to use (e.g., 'gemini-2.0-flash')"),
  },
  async ({ model_name }) => {
    currentVisionModel = model_name;
    return { content: [{ type: "text", text: `Vision model set to: ${model_name}` }] };
  }
);

server.tool(
  "list_vision_models",
  "Lists available models that can be used for vision (image-to-code) tasks.",
  {},
  async () => {
    const modelsList = await listAvailableModels();
    return { content: [{ type: "text", text: modelsList }] };
  }
);

// --- Vision & Figma Tools ---

server.tool(
  "screenshot_to_code",
  "Takes a screenshot of a URL and converts it to code.",
  { url: z.string().describe("The URL to capture and convert") },
  async ({ url }) => {
    if (!currentVisionModel) {
      return { content: [{ type: "text", text: "Error: Vision model not set. Please call 'list_vision_models' to see available models, then 'set_vision_model' to choose one for image-to-code tasks." }] };
    }
    const screenshotPath = await captureScreenshot(url, "latest_screenshot.png");
    const code = await convertImageToCode(screenshotPath, "React + Tailwind", currentVisionModel);
    return { content: [{ type: "text", text: code }] };
  }
);

server.tool(
  "image_to_code",
  "Converts a local image file to code.",
  { image_path: z.string().describe("Absolute path to the image file") },
  async ({ image_path }) => {
    if (!currentVisionModel) {
      return { content: [{ type: "text", text: "Error: Vision model not set. Please call 'list_vision_models' to see available models, then 'set_vision_model' to choose one for image-to-code tasks." }] };
    }
    const code = await convertImageToCode(image_path, "React + Tailwind", currentVisionModel);
    return { content: [{ type: "text", text: code }] };
  }
);

server.tool(
  "figma_to_code",
  "Converts a Figma design node to code. Requires a Personal Access Token.",
  {
    file_key: z.string().describe("The Figma file key"),
    node_id: z.string().describe("The Figma node ID (e.g., '1:2')"),
    access_token: z.string().describe("Your Figma Personal Access Token"),
  },
  async ({ file_key, node_id, access_token }) => {
    if (!currentVisionModel) {
      return { content: [{ type: "text", text: "Error: Vision model not set. Please call 'list_vision_models' to see available models, then 'set_vision_model' to choose one for image-to-code tasks." }] };
    }
    const code = await convertFigmaToCode(file_key, node_id, access_token, "React + Tailwind", currentVisionModel);
    return { content: [{ type: "text", text: code }] };
  }
);

// --- File System Tools (Safe Mode) ---

server.tool(
  "read_file",
  "Reads the content of a file from the local filesystem.",
  { path: z.string().describe("Absolute path to the file") },
  async ({ path }) => {
    const content = await readFile(path);
    return { content: [{ type: "text", text: content }] };
  }
);

server.tool(
  "list_directory",
  "Lists files and directories in a given path.",
  { path: z.string().describe("Absolute path to the directory") },
  async ({ path }) => {
    const content = await listDirectory(path);
    return { content: [{ type: "text", text: content }] };
  }
);

// --- Review Workflow Tools ---

server.tool(
  "propose_write_file",
  "Proposes a file write. Returns an ID. You must then ask the user to confirm/approve this action.",
  {
    path: z.string().describe("Absolute path to the file"),
    content: z.string().describe("The content to write"),
  },
  async ({ path, content }) => {
    const id = requestFileWrite(path, content);
    return { content: [{ type: "text", text: `Action Proposed: Write to ${path}.\nID: ${id}\n\nPlease ask the user to approve this with 'approve_action("${id}")'.` }] };
  }
);

server.tool(
  "propose_shell_command",
  "Proposes a shell command. Returns an ID. You must then ask the user to confirm/approve this action.",
  { command: z.string().describe("The shell command to execute") },
  async ({ command }) => {
    const id = requestShellCommand(command);
    return { content: [{ type: "text", text: `Action Proposed: Run command '${command}'.\nID: ${id}\n\nPlease ask the user to approve this with 'approve_action("${id}")'.` }] };
  }
);

server.tool(
  "approve_action",
  "Approves and executes a pending action by ID.",
  { id: z.string().describe("The ID of the action to approve") },
  async ({ id }) => {
    const result = await approveAction(id);
    return { content: [{ type: "text", text: result }] };
  }
);

server.tool(
  "reject_action",
  "Rejects and discards a pending action by ID.",
  { id: z.string().describe("The ID of the action to reject") },
  async ({ id }) => {
    const result = rejectAction(id);
    return { content: [{ type: "text", text: result }] };
  }
);

server.tool(
  "list_pending_actions",
  "Lists all actions waiting for approval.",
  {},
  async () => {
    const result = listPendingActions();
    return { content: [{ type: "text", text: result }] };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Custom AI MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
