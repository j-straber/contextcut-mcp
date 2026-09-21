// index.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { execFile } from "child_process";
import { promisify } from "util";
import { fileURLToPath } from 'url';
import path from 'path';

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONTEXTCUT_BIN = path.join(__dirname, "..", "bin", "contextcut");

const server = new Server(
  {
    name: "5tra83r-contextcut-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 1. Expose the Tool to the LLM
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "prune_code_context",
        description:
          "Reads a source file and returns an AST-pruned version containing only signatures, types, and docstrings. Use this to save context window tokens when full implementation details aren't needed.",
        inputSchema: {
          type: "object",
          properties: {
            target_path: {
              type: "string",
              description: "Absolute path to the source file to prune",
            },
          },
          required: ["target_path"],
        },
      },
    ],
  };
});

// 2. Handle Tool Execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== "prune_code_context") {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }

  const targetPath = String(request.params.arguments?.target_path);

  if (!targetPath) {
    throw new Error("target_path argument is required");
  }

  try {
    // Execute the Python engine and capture stdout
    const { stdout, stderr } = await execFileAsync(CONTEXTCUT_BIN, [targetPath]);

    if (stderr) {
      console.error(`ContextCut Warning: ${stderr}`);
    }

    // Return the pruned code back to the LLM
    return {
      content: [
        {
          type: "text",
          text: stdout, 
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error executing ContextCut: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// 3. Start the Server via Stdio (Standard MCP Transport)
async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("ContextCut MCP Server is running on stdio");
}

run().catch(console.error);