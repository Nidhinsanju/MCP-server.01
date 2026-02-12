
# Configuring Custom MCP in Windsurf IDE

To use your Custom AI MCP server in **Windsurf**, you need to add it to the MCP configuration file.

1.  **Locate Configuration File**:
    - Open Windsurf.
    - Go to **File > Preferences > Settings** (or press `Ctrl+,`).
    - Search for "MCP" or look for an "MCP Servers" configuration section.
    - Alternatively, look for a file named `mcp_config.json` or similar in your user directory (often `%APPDATA%\Windsurf\User\` or `~/.windsurf/`).

2.  **Add Server Configuration**:
    Add the following JSON object to the "mcpServers" section:

    ```json
    {
      "mcpServers": {
        "custom-ai-mcp": {
          "command": "node",
          "args": ["E:/Development/MCP/dist/index.js"],
          "env": {
            "OPTIMIZER_API_KEY": "YOUR_GEMINI_API_KEY",
            "EXECUTION_API_KEY": "YOUR_OPENAI_API_KEY",
            "FIGMA_ACCESS_TOKEN": "YOUR_FIGMA_TOKEN"
          }
        }
      }
    }
    ```

3.  **Restart Windsurf**:
    - Completely close and reopen Windsurf to load the new MCP server.

4.  **Verification**:
    - Open a new chat in Windsurf.
    - You should see a "Tools" icon or menu.
    - Look for `optimize_prompt`, `smart_ask`, `screenshot_to_code`, etc.
    - Try asking: *"Smart ask: Explain quantum computing simply."*
