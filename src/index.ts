import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { McpErrorSchema } from "./errors.js";
import { optimizePrompt } from "./tools/optimizer.js";
import { executePrompt } from "./tools/executor.js";
import { captureScreenshot, convertImageToCode } from "./tools/vision.js";
import { convertFigmaToCode } from "./tools/figma.js";
import { readFile, writeFile, listDirectory } from "./tools/filesystem.js";
import { requestFileWrite, requestShellCommand, listPendingActions, approveAction, rejectAction } from "./tools/review.js";
import { listAvailableModels } from "./list_models_rest.js"; // Import the new function

const promptCache = new Map<string, string>();

const server = new McpServer({
  name: "custom-ai-mcp",
  version: "1.0.0",
});

let currentVisionModel: string | undefined = undefined;

// --- AI & Optimization Tools ---

server.registerTool(
  "optimize_prompt",
  {
    description: "Refines a user prompt to be more efficient and clear for LLMs. Call this tool only when the user's prompt explicitly contains the '@MCP' tag.",
    inputSchema: z.object({ prompt: z.string().describe("The user prompt to optimize") }),
  },
  async ({ prompt }) => {
    const optimized = await optimizePrompt(prompt);
    return { content: [{ type: "text", text: optimized }] };
  }
);

server.registerTool(
  "execute_model",
  {
    description: "Executes a prompt using a specified AI model (default: gpt-4o). Call this tool only when the user's prompt explicitly contains the '@MCP' tag.",
    inputSchema: z.object({
      prompt: z.string().describe("The prompt to execute"),
      model: z.string().optional().describe("The model to use (default: gpt-4o)"),
    }),
  },
  async ({ prompt, model }) => {
    try {
      const result = await executePrompt(prompt, model);
      return { content: [{ type: "text", text: result }] };
    } catch (error) {
      if (error instanceof Error && error.message.includes("API_KEY_NOT_SET")) {
        const errorPayload = {
          code: "API_KEY_NOT_SET",
          message: "Execution API key is missing.",
          action_hint: "Please set EXECUTION_API_KEY or OPENAI_API_KEY in your environment (.env file)."
        };
        return {
          content: [{ type: "text", text: `Error: ${errorPayload.message}` }],
          isError: true,
          structuredError: McpErrorSchema.parse(errorPayload)
        };
      }
      throw error; // Re-throw other errors
    }
  }
);

server.registerTool(
  "smart_ask",
  {
    description: "Use this tool only when the user's prompt explicitly contains the '@MCP' tag. Optimizes the prompt first, then executes it with a premium model.",
    inputSchema: z.object({ prompt: z.string().describe("The user prompt") }),
  },
  async ({ prompt }) => {
    // Check if the result is already in the cache
    if (promptCache.has(prompt)) {
      // console.error("Returning cached result for prompt:", prompt);
      return { content: [{ type: "text", text: promptCache.get(prompt)! }] };
    }

    try {
      const optimized = await optimizePrompt(prompt);
      const result = await executePrompt(optimized);

      // Store the new result in the cache
      promptCache.set(prompt, result);

      return {
        content: [
          { type: "text", text: `Optimized Prompt: ${optimized}\n\nResult:\n${result}` },
        ],
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("API_KEY_NOT_SET")) {
        const errorPayload = {
          code: "API_KEY_NOT_SET",
          message: "Execution API key is missing.",
          action_hint: "Please set EXECUTION_API_KEY or OPENAI_API_KEY in your environment (.env file)."
        };
        return {
          content: [{ type: "text", text: `Error: ${errorPayload.message}` }],
          isError: true,
          structuredError: McpErrorSchema.parse(errorPayload)
        };
      }
      throw error; // Re-throw other errors
    }
  }
);

server.registerTool(
  "set_vision_model",
  {
    description: "Sets the model to be used for vision (image-to-code) tasks. Call this tool only when the user's prompt explicitly contains the '@MCP' tag.",
    inputSchema: z.object({
      model_name: z.string().describe("The name of the vision model to use (e.g., 'gemini-2.0-flash')"),
    }),
  },
  async ({ model_name }) => {
    currentVisionModel = model_name;
    return { content: [{ type: "text", text: `Vision model set to: ${model_name}` }] };
  }
);

server.registerTool(
  "list_vision_models",
  {
    description: "Lists available models that can be used for vision (image-to-code) tasks. Call this tool only when the user's prompt explicitly contains the '@MCP' tag.",
    inputSchema: z.object({}),
  },
  async () => {
    const modelsList = await listAvailableModels();
    return { content: [{ type: "text", text: modelsList }] };
  }
);

// --- Vision & Figma Tools ---

server.registerTool(
  "screenshot_to_code",
  {
    description: "Takes a screenshot of a URL and converts it to code. Call this tool only when the user's prompt explicitly contains the '@MCP' tag.",
    inputSchema: z.object({ url: z.string().describe("The URL to capture and convert") }),
  },
  async ({ url }) => {
    if (!currentVisionModel) {
      const errorPayload = {
        code: "VISION_MODEL_NOT_SET",
        message: "Vision model is not set.",
        action_hint: "Call 'list_vision_models' to see available models, then 'set_vision_model' to choose one."
      };
      return {
        content: [{ type: "text", text: `Error: ${errorPayload.message}` }],
        isError: true,
        structuredError: McpErrorSchema.parse(errorPayload)
      };
    }
    const screenshotPath = await captureScreenshot(url, "latest_screenshot.png");
    const code = await convertImageToCode(screenshotPath, "React + Tailwind", currentVisionModel);
    return { content: [{ type: "text", text: code }] };
  }
);

server.registerTool(
  "image_to_code",
  {
    description: "Converts a local image file to code. Call this tool only when the user's prompt explicitly contains the '@MCP' tag.",
    inputSchema: z.object({ image_path: z.string().describe("Absolute path to the image file") }),
  },
  async ({ image_path }) => {
    if (!currentVisionModel) {
      const errorPayload = {
        code: "VISION_MODEL_NOT_SET",
        message: "Vision model is not set.",
        action_hint: "Call 'list_vision_models' to see available models, then 'set_vision_model' to choose one."
      };
      return {
        content: [{ type: "text", text: `Error: ${errorPayload.message}` }],
        isError: true,
        structuredError: McpErrorSchema.parse(errorPayload)
      };
    }
    const code = await convertImageToCode(image_path, "React + Tailwind", currentVisionModel);
    return { content: [{ type: "text", text: code }] };
  }
);

server.registerTool(
  "figma_to_code",
  {
    description: "Converts a Figma design node to code. Requires a Personal Access Token. Call this tool only when the user's prompt explicitly contains the '@MCP' tag.",
    inputSchema: z.object({
      file_key: z.string().describe("The Figma file key"),
      node_id: z.string().describe("The Figma node ID (e.g., '1:2')"),
      access_token: z.string().describe("Your Figma Personal Access Token"),
    }),
  },
  async ({ file_key, node_id, access_token }) => {
    if (!currentVisionModel) {
      const errorPayload = {
        code: "VISION_MODEL_NOT_SET",
        message: "Vision model is not set.",
        action_hint: "Call 'list_vision_models' to see available models, then 'set_vision_model' to choose one."
      };
      return {
        content: [{ type: "text", text: `Error: ${errorPayload.message}` }],
        isError: true,
        structuredError: McpErrorSchema.parse(errorPayload)
      };
    }
    const code = await convertFigmaToCode(file_key, node_id, access_token, "React + Tailwind", currentVisionModel);
    return { content: [{ type: "text", text: code }] };
  }
);

// --- File System Tools (Safe Mode) ---

server.registerTool(
  "read_file",
  {
    description: "Reads the content of a file from the local filesystem. Call this tool only when the user's prompt explicitly contains the '@MCP' tag.",
    inputSchema: z.object({ path: z.string().describe("Absolute path to the file") }),
  },
  async ({ path }) => {
    const content = await readFile(path);
    return { content: [{ type: "text", text: content }] };
  }
);

server.registerTool(
  "list_directory",
  {
    description: "Lists files and directories in a given path. Call this tool only when the user's prompt explicitly contains the '@MCP' tag.",
    inputSchema: z.object({ path: z.string().describe("Absolute path to the directory") }),
  },
  async ({ path }) => {
    const content = await listDirectory(path);
    return { content: [{ type: "text", text: content }] };
  }
);

// --- Review Workflow Tools ---

server.registerTool(
  "propose_write_file",
  {
    description: "Proposes a file write. Returns an ID. You must then ask the user to confirm/approve this action. Call this tool only when the user's prompt explicitly contains the '@MCP' tag.",
    inputSchema: z.object({
      path: z.string().describe("Absolute path to the file"),
      content: z.string().describe("The content to write"),
    }),
  },
  async ({ path, content }) => {
    const id = requestFileWrite(path, content);
    return { content: [{ type: "text", text: `Action Proposed: Write to ${path}.\nID: ${id}\n\nPlease ask the user to approve this with 'approve_action("${id}")'.` }] };
  }
);

server.registerTool(
  "propose_shell_command",
  {
    description: "Proposes a shell command. Returns an ID. You must then ask the user to confirm/approve this action. Call this tool only when the user's prompt explicitly contains the '@MCP' tag.",
    inputSchema: z.object({ command: z.string().describe("The shell command to execute") }),
  },
  async ({ command }) => {
    const id = requestShellCommand(command);
    return { content: [{ type: "text", text: `Action Proposed: Run command '${command}'.\nID: ${id}\n\nPlease ask the user to approve this with 'approve_action("${id}")'.` }] };
  }
);

server.registerTool(
  "approve_action",
  {
    description: "Use this tool only when the user's prompt explicitly contains the '@MCP' tag. Approves and executes a pending action by ID.",
    inputSchema: z.object({ id: z.string().describe("The ID of the action to approve") }),
  },
  async ({ id }) => {
    const result = await approveAction(id);
    return { content: [{ type: "text", text: result }] };
  }
);

server.registerTool(
  "reject_action",
  {
    description: "Use this tool only when the user's prompt explicitly contains the '@MCP' tag. Rejects and discards a pending action by ID.",
    inputSchema: z.object({ id: z.string().describe("The ID of the action to reject") }),
  },
  async ({ id }) => {
    const result = rejectAction(id);
    return { content: [{ type: "text", text: result }] };
  }
);

server.registerTool(
  "list_pending_actions",
  {
    description: "Use this tool only when the user's prompt explicitly contains the '@MCP' tag. Lists all actions waiting for approval.",
    inputSchema: z.object({}),
  },
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
