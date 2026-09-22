#!/usr/bin/env python3
# ==============================================================================
# © 2026 5tra83r Studios. All rights reserved.
#
# PROPRIETARY AND CONFIDENTIAL
# This source code and any compiled binaries are the sole property of 
# 5tra83r Studios. Unauthorized copying, modification, distribution, or use 
# of this file, via any medium, is strictly prohibited without express written 
# permission from 5tra83r Studios.
# ==============================================================================
"""
ContextCut - AST-Based Context Pruner for LLMs & AI Coding Agents.
Parses source files and directories, strips function bodies while preserving
signatures, types, dataclass fields, and docstrings, and measures token and
financial cost reduction telemetry.
"""

import ast
import argparse
import fnmatch
import json
import os
import sys
from typing import List, Tuple, Optional, Dict, Any
from datetime import datetime, timezone

# Cost reference: $3.00 per 1M input tokens (Frontier standard: Claude 3.5 Sonnet / GPT-4o)
COST_PER_MILLION_TOKENS = 3.00


class ContextPruner(ast.NodeTransformer):
    """
    Visits the Abstract Syntax Tree (AST) of a Python file and replaces
    the bodies of all functions and methods with a 'pass' statement,
    retaining docstrings and type annotations according to depth settings.
    """
    def __init__(self, keep_docstrings: bool = True):
        super().__init__()
        self.keep_docstrings = keep_docstrings

    def visit_FunctionDef(self, node: ast.FunctionDef) -> ast.FunctionDef:
        docstring = ast.get_docstring(node) if self.keep_docstrings else None
        new_body: List[ast.stmt] = []

        if docstring:
            new_body.append(ast.Expr(value=ast.Constant(value=docstring)))

        new_body.append(ast.Pass())
        node.body = new_body
        return node

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef) -> ast.AsyncFunctionDef:
        docstring = ast.get_docstring(node) if self.keep_docstrings else None
        new_body: List[ast.stmt] = []

        if docstring:
            new_body.append(ast.Expr(value=ast.Constant(value=docstring)))

        new_body.append(ast.Pass())
        node.body = new_body
        return node

    def visit_ClassDef(self, node: ast.ClassDef) -> ast.ClassDef:
        # Recursively visit methods inside the class while preserving class-level fields
        self.generic_visit(node)
        return node


def estimate_tokens(char_count: int) -> int:
    """Heuristic estimate of tokens for code (approx 4 chars per token)."""
    return max(1, char_count // 4) if char_count > 0 else 0


def calculate_cost_savings(tokens_saved: int) -> float:
    """Calculates estimated dollar savings per request based on standard pricing."""
    return (tokens_saved / 1_000_000.0) * COST_PER_MILLION_TOKENS


def format_telemetry_header(
    files_count: int,
    orig_chars: int,
    pruned_chars: int,
) -> str:
    """Generates the standardized ContextCut Telemetry block comment."""
    saved_chars = max(0, orig_chars - pruned_chars)
    orig_tokens = estimate_tokens(orig_chars)
    pruned_tokens = estimate_tokens(pruned_chars)
    saved_tokens = max(0, orig_tokens - pruned_tokens)
    pct_saved = (saved_chars / orig_chars * 100.0) if orig_chars > 0 else 0.0
    cost_saved = calculate_cost_savings(saved_tokens)

    file_line = f"Files Pruned:   {files_count}\n" if files_count > 1 else ""

    return f'''"""
[ContextCut Telemetry]
----------------------------------------
{file_line}Original Size:  {orig_chars:,} chars (~{orig_tokens:,} tokens)
Pruned Size:    {pruned_chars:,} chars (~{pruned_tokens:,} tokens)
Token Savings:  {pct_saved:.1f}% reduction (~{saved_tokens:,} tokens saved)
Est. Cost Saved: ${cost_saved:.4f} per prompt (@ ${COST_PER_MILLION_TOKENS:.2f}/1M tokens)
----------------------------------------
"""

'''


def prune_code_string(
    source_code: str,
    keep_docstrings: bool = True,
    file_label: Optional[str] = None,
) -> Tuple[str, int, int]:
    """
    Prunes a raw Python code string using AST.
    Returns: (pruned_code, original_char_count, pruned_char_count)
    """
    original_chars = len(source_code)
    if not source_code.strip():
        return source_code, original_chars, original_chars

    try:
        tree = ast.parse(source_code)
    except SyntaxError as e:
        warning = f"# [ContextCut Warning: SyntaxError while parsing {file_label or 'input'}: {e}]\n"
        return warning + source_code, original_chars, original_chars + len(warning)

    pruner = ContextPruner(keep_docstrings=keep_docstrings)
    pruned_tree = pruner.visit(tree)
    ast.fix_missing_locations(pruned_tree)

    pruned_source = ast.unparse(pruned_tree)
    pruned_chars = len(pruned_source)

    return pruned_source, original_chars, pruned_chars


def prune_file(
    file_path: str,
    keep_docstrings: bool = True,
) -> Tuple[str, int, int]:
    """Reads a Python file from disk and prunes it."""
    with open(file_path, "r", encoding="utf-8", errors="replace") as f:
        source = f.read()
    return prune_code_string(source, keep_docstrings=keep_docstrings, file_label=file_path)


def prune_directory(
    dir_path: str,
    glob_pattern: str = "*.py",
    keep_docstrings: bool = True,
) -> Tuple[str, int, int, int]:
    """
    Recursively scans a directory for files matching glob_pattern,
    prunes each file, and aggregates the results with file headers.
    Returns: (combined_pruned_code, total_orig_chars, total_pruned_chars, files_processed)
    """
    total_orig = 0
    total_pruned = 0
    files_processed = 0
    results: List[str] = []

    # Walk directory in deterministic order
    for root, dirs, files in os.walk(dir_path):
        # Ignore common hidden or cache directories
        dirs[:] = sorted([d for d in dirs if not d.startswith(".") and d not in ("__pycache__", "node_modules", "dist", "build", "venv", ".venv")])
        files.sort()

        for filename in files:
            if fnmatch.fnmatch(filename, glob_pattern):
                full_path = os.path.join(root, filename)
                rel_path = os.path.relpath(full_path, dir_path)
                try:
                    pruned_code, orig_c, pruned_c = prune_file(full_path, keep_docstrings=keep_docstrings)
                    total_orig += orig_c
                    total_pruned += pruned_c
                    files_processed += 1

                    results.append(f"# ========================================\n# File: {rel_path}\n# ========================================\n{pruned_code}\n")
                except Exception as e:
                    results.append(f"# [ContextCut Error reading {rel_path}: {e}]\n")

    combined_code = "\n".join(results)
    return combined_code, total_orig, total_pruned, files_processed


def prune_target(
    target_path: Optional[str] = None,
    code_content: Optional[str] = None,
    glob_pattern: str = "*.py",
    depth: str = "interfaces_only",
    include_telemetry: bool = True,
) -> Dict[str, Any]:
    """
    Main programmatic entry point for pruning files, directories, or raw strings.
    """
    keep_docstrings = (depth != "minimal" and depth != "docstrings_removed")

    if code_content is not None:
        pruned_code, orig_c, pruned_c = prune_code_string(code_content, keep_docstrings=keep_docstrings)
        files_count = 1
    elif target_path:
        if not os.path.exists(target_path):
            raise FileNotFoundError(f"Target path does not exist: {target_path}")

        if os.path.isdir(target_path):
            pruned_code, orig_c, pruned_c, files_count = prune_directory(
                target_path, glob_pattern=glob_pattern, keep_docstrings=keep_docstrings
            )
        else:
            pruned_code, orig_c, pruned_c = prune_file(target_path, keep_docstrings=keep_docstrings)
            files_count = 1
    else:
        raise ValueError("Either target_path or code_content must be provided.")

    header = format_telemetry_header(files_count, orig_c, pruned_c) if include_telemetry else ""
    full_output = header + pruned_code

    saved_tokens = max(0, estimate_tokens(orig_c) - estimate_tokens(pruned_c))

    return {
        "output": full_output,
        "files_count": files_count,
        "orig_chars": orig_c,
        "pruned_chars": pruned_c,
        "orig_tokens": estimate_tokens(orig_c),
        "pruned_tokens": estimate_tokens(pruned_c),
        "saved_tokens": saved_tokens,
        "cost_saved_usd": calculate_cost_savings(saved_tokens),
        "reduction_pct": ((orig_c - pruned_c) / orig_c * 100.0) if orig_c > 0 else 0.0,
    }


def record_telemetry_event(result: Dict[str, Any], target_label: Optional[str] = None) -> None:
    """Appends a prune run event to ~/.contextcut/history.jsonl (failsafe)."""
    try:
        hist_env = os.environ.get("CONTEXTCUT_HISTORY_FILE")
        if hist_env:
            history_path = hist_env
        else:
            history_path = os.path.join(os.path.expanduser("~"), ".contextcut", "history.jsonl")

        os.makedirs(os.path.dirname(history_path), exist_ok=True)

        sanitized_target = None
        if target_label:
            parts = os.path.normpath(target_label).split(os.sep)
            sanitized_target = "/".join(parts[-3:])

        record = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "lang": "python",
            "target": sanitized_target,
            "files": result.get("files_count", 1),
            "origChars": result.get("orig_chars", 0),
            "prunedChars": result.get("pruned_chars", 0),
            "origTokens": result.get("orig_tokens", 0),
            "prunedTokens": result.get("pruned_tokens", 0),
            "savedTokens": result.get("saved_tokens", 0),
            "savedUsd": round(result.get("cost_saved_usd", 0.0), 6),
        }

        with open(history_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(record) + "\n")
    except Exception:
        pass


def main():
    parser = argparse.ArgumentParser(
        description="ContextCut - AST-Based Context Pruner for LLMs"
    )
    parser.add_argument("target", nargs="?", default=None, help="Target file or directory path")
    parser.add_argument("--code", type=str, default=None, help="Raw code string to prune")
    parser.add_argument("--glob", type=str, default="*.py", help="Glob pattern for directories (default: *.py)")
    parser.add_argument(
        "--depth",
        choices=["interfaces_only", "minimal"],
        default="interfaces_only",
        help="Pruning depth ('interfaces_only' retains docstrings; 'minimal' strips them)",
    )
    parser.add_argument("--no-telemetry", action="store_true", help="Omit the telemetry header")
    parser.add_argument("--json", action="store_true", help="Output JSON metadata along with code")
    parser.add_argument("--no-history", action="store_true", help="Do not record this run in ~/.contextcut/history.jsonl")

    args = parser.parse_args()

    # Support reading from stdin if no target or --code is given and stdin is piped
    code_input = args.code
    if args.target is None and code_input is None:
        if not sys.stdin.isatty():
            code_input = sys.stdin.read()
        else:
            parser.print_help(sys.stderr)
            sys.exit(1)

    try:
        result = prune_target(
            target_path=args.target,
            code_content=code_input,
            glob_pattern=args.glob,
            depth=args.depth,
            include_telemetry=not args.no_telemetry,
        )

        if not args.no_history:
            record_telemetry_event(result, target_label=args.target or "<raw_code>")

        if args.json:
            print(json.dumps(result, indent=2))
        else:
            print(result["output"])
    except Exception as e:
        sys.stderr.write(f"ContextCut Error: {e}\n")
        sys.exit(1)


if __name__ == "__main__":
    main()