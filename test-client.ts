
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import dotenv from 'dotenv';
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
dotenv.config();

async function main() {
  const transport = new StdioClientTransport({
    command: "node",
    args: ["dist/index.js"],
    env: process.env as Record<string, string>
  });

  const client = new Client(
    {
      name: "test-client",
      version: "1.0.0",
    },
    {
      capabilities: {},
    }
  );

  await client.connect(transport);
  console.log("Connected to MCP Server!");

  console.log("\n--- Listing Tools ---");
  const tools = await client.listTools();
  tools.tools.forEach(tool => console.log(`- ${tool.name}: ${tool.description}`));

  console.log("\n--- Testing 'optimize_prompt' ---");
  const optimizeResult = await client.callTool({
    name: "optimize_prompt",
    arguments: { prompt: "i want a function to add two numbers in python please" }
  }) as CallToolResult;
  console.log("Result:", (optimizeResult.content[0] as any).text);

  console.log("\n--- Testing 'list_directory' (Safe Mode) ---");
  const listResult = await client.callTool({
    name: "list_directory",
    arguments: { path: process.cwd() }
  }) as CallToolResult;
  console.log((listResult.content[0] as any).text.slice(0, 200) + "..."); // Truncate output

  await client.close();
}

main().catch(console.error);
