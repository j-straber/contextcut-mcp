# ContextCut MCP Server (Beta)

An AST-based context pruner for LLMs. This local MCP server intercepts Python files and strips out function bodies, returning only signatures, types, and docstrings to the LLM to drastically reduce token bloat.

## Setup Instructions

1. Install Dependencies:
   npm install

2. Build the Python Engine:
   Ensure you have PyInstaller installed (pip install pyinstaller), then compile:
   pyinstaller --onefile --distpath ./bin --name contextcut python_engine/contextcut.py

3. Build the TypeScript Server:
   npx tsc

4. Connect to Claude Desktop:
   Add this to your claude_desktop_config.json:
   {
     "mcpServers": {
       "contextcut": {
         "command": "node",
         "args": ["/Users/straber/Projects/contextcut-mcp/build/index.js"]
       }
     }
   }
