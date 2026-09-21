# Supported Environments

ContextCut is fully platform-independent and runs anywhere the Model Context Protocol (MCP) or local binaries are supported. 

## 1. Claude Desktop
Add to your `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "contextcut": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/contextcut-mcp/build/index.js"]
    }
  }
}
eof
