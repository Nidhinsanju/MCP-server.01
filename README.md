# Custom AI MCP Server

This is a custom Model Context Protocol (MCP) server designed to give you "superpowers" in your IDE (like VS Code or Cursor).

## Features

1.  **Smart Prompt Optimization**:
    - Uses a cost-effective model (Gemini 1.5 Flash) to rewrite your prompts to be clearer and more token-efficient.
    - Saves money on expensive model calls.
2.  **Model Execution**:
    - Connects to premium models (GPT-4o) to execute the optimized prompts.
3.  **Vision Capabilities**:
    - **Screenshot to Code**: Takes a URL, captures a screenshot, and converts it to clean code (React/Tailwind).
    - **Image to Code**: Converts local images to code.
4.  **Figma to Code**:
    - Fetches deep design details from Figma and converts them to production-ready code.

## Setup

1.  **Install Dependencies**:
    ```bash
    npm install
    ```
2.  **Configure Environment**:
    - Rename `.env.example` to `.env`.
    - Add your API keys:
        - `OPTIMIZER_API_KEY`: Gemini API Key (Get it from Google AI Studio).
        - `EXECUTION_API_KEY`: OpenAI API Key.
        - `FIGMA_ACCESS_TOKEN`: Figma Personal Access Token.
3.  **Build**:
    ```bash
    npm run build
    ```

## Usage in VS Code / Cursor

add the following to your `settings.json` (or MCP settings):

```json
"mcp.servers": {
  "custom-ai": {
    "command": "node",
    "args": ["E:/Development/MCP/dist/index.js"],
    "env": {
      "OPTIMIZER_API_KEY": "...",
      "EXECUTION_API_KEY": "...",
      "FIGMA_ACCESS_TOKEN": "..."
    }
  }
}
```

## Tools

- `optimize_prompt(prompt)`: Refines your prompt.
- `execute_model(prompt, model)`: Runs a prompt on a specific model.
- `smart_ask(prompt)`: Optimizes then executes.
- `screenshot_to_code(url)`: Captures URL and returns code.
- `figma_to_code(file_key, node_id)`: Converts Figma node to code.
