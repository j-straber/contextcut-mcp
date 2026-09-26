/**
 * ==============================================================================
 * © 2026 5tra83r Studios LLC. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * ContextCut TypeScript / JavaScript AST Pruning Engine (Pro Engine)
 * ==============================================================================
 */

import { parse } from "@babel/parser";
import fs from "fs";
import { applyAiSafetyGuardrails } from "./safety_guardrail.js";

export interface PruneResult {
  pruned: string;
  origChars: number;
  prunedChars: number;
  secretsRedacted: number;
  redactedTypes: string[];
}

interface NodeRange {
  start: number;
  end: number;
}

/**
 * Prunes a TypeScript or JavaScript source string using AST boundary replacement.
 * Preserves imports, exports, interfaces, type definitions, class properties,
 * and function signatures while replacing function/method bodies with '{ /* stub *\/ }'.
 */
export function pruneTypeScriptCode(
  sourceCode: string,
  options: { keepDocstrings?: boolean } = {}
): PruneResult {
  const origChars = sourceCode.length;
  if (!sourceCode.trim()) {
    return { pruned: sourceCode, origChars, prunedChars: origChars, secretsRedacted: 0, redactedTypes: [] };
  }

  let ast: any;
  try {
    ast = parse(sourceCode, {
      sourceType: "module",
      plugins: [
        "typescript",
        "jsx",
        "decorators-legacy",
        "classProperties",
        "asyncGenerators",
      ],
      tokens: false,
    });
  } catch (error) {
    const warning = `// [ContextCut Warning: Parse error: ${error instanceof Error ? error.message : String(error)}]\n`;
    const safety = applyAiSafetyGuardrails(sourceCode);
    return {
      pruned: warning + safety.sanitized,
      origChars,
      prunedChars: (warning + safety.sanitized).length,
      secretsRedacted: safety.secretsRedacted,
      redactedTypes: safety.redactedTypes,
    };
  }

  const rangesToStub: NodeRange[] = [];

  function walk(node: any) {
    if (!node || typeof node !== "object") return;

    const isFunctionLike =
      node.type === "FunctionDeclaration" ||
      node.type === "FunctionExpression" ||
      node.type === "ArrowFunctionExpression" ||
      node.type === "ClassMethod" ||
      node.type === "ClassPrivateMethod";

    if (
      isFunctionLike &&
      node.body &&
      node.body.type === "BlockStatement" &&
      typeof node.body.start === "number" &&
      typeof node.body.end === "number"
    ) {
      rangesToStub.push({ start: node.body.start, end: node.body.end });
      // Do not traverse into children of the body we are replacing
      return;
    } else if (
      node.type === "ArrowFunctionExpression" &&
      node.body &&
      node.body.type !== "BlockStatement" &&
      typeof node.body.start === "number" &&
      typeof node.body.end === "number"
    ) {
      // Expression body arrow function: (x) => x * 2  -->  (x) => { /* stub */ }
      rangesToStub.push({ start: node.body.start, end: node.body.end });
      return;
    }

    // Traverse all child properties
    for (const key of Object.keys(node)) {
      const val = node[key];
      if (Array.isArray(val)) {
        for (const item of val) {
          walk(item);
        }
      } else if (val && typeof val === "object") {
        walk(val);
      }
    }
  }

  walk(ast);

  // Sort ranges in descending order so earlier replacements do not invalidate later offsets
  rangesToStub.sort((a, b) => b.start - a.start);

  let pruned = sourceCode;
  for (const range of rangesToStub) {
    pruned = pruned.slice(0, range.start) + "{ /* stub */ }" + pruned.slice(range.end);
  }

  // Apply 5tra83r Studios LLC. AI Safety Guardrail (Secret & Credential Redaction)
  const safety = applyAiSafetyGuardrails(pruned);

  return {
    pruned: safety.sanitized,
    origChars,
    prunedChars: safety.sanitized.length,
    secretsRedacted: safety.secretsRedacted,
    redactedTypes: safety.redactedTypes,
  };
}

/**
 * Reads and prunes a TypeScript/JavaScript file from disk.
 */
export async function pruneTypeScriptFile(
  filePath: string,
  options: { keepDocstrings?: boolean } = {}
): Promise<PruneResult> {
  const content = await fs.promises.readFile(filePath, "utf-8");
  return pruneTypeScriptCode(content, options);
}
