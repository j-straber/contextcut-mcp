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
ContextCut - AST-Based Context Pruner 
Parses source files, strips function bodies while preserving signatures, 
types, and docstrings, and measures token reduction telemetry.
"""
import ast
import os
import sys

class ContextPruner(ast.NodeTransformer):
    def visit_FunctionDef(self, node):
        pass
    def visit_AsyncFunctionDef(self, node):
        pass
    def visit_ClassDef(self, node):
        pass

def prune_ast(file_path: str) -> str:
    with open(file_path, "r", encoding="utf-8") as f:
        original_source = f.read()

    # Parse and transform the AST
    tree = ast.parse(original_source)
    transformer = ContextPruner()
    transformed_tree = transformer.visit(tree)
    ast.fix_missing_locations(transformed_tree)
    
    pruned_source = ast.unparse(transformed_tree)

    # Calculate telemetry metrics
    orig_chars = len(original_source)
    pruned_chars = len(pruned_source)
    saved_chars = orig_chars - pruned_chars
    
    # Rough token approximation (~4 chars per token)
    orig_tokens_est = orig_chars // 4
    pruned_tokens_est = pruned_chars // 4
    saved_tokens_est = saved_chars // 4
    pct_saved = (saved_chars / orig_chars * 100) if orig_chars > 0 else 0

    telemetry_header = f'''"""
[ContextCut Telemetry]
----------------------------------------
Original Size:  {orig_chars:,} chars (~{orig_tokens_est:,} tokens)
Pruned Size:    {pruned_chars:,} chars (~{pruned_tokens_est:,} tokens)
Token Savings:  {pct_saved:.1f}% reduction (~{saved_tokens_est:,} tokens saved)
----------------------------------------
"""

'''
    return telemetry_header + pruned_source


class ContextPruner(ast.NodeTransformer):
    """
    Visits the Abstract Syntax Tree (AST) of a Python file and replaces 
    the bodies of all functions and methods with a 'pass' statement, 
    retaining only the docstring if one exists.
    """
    def visit_FunctionDef(self, node):
        docstring = ast.get_docstring(node)
        new_body = []
        
        if docstring:
            # Reconstruct the docstring node
            new_body.append(ast.Expr(value=ast.Constant(value=docstring)))
            
        new_body.append(ast.Pass())
        node.body = new_body
        
        # Return the modified node without recursing into the now-deleted body
        return node

    def visit_AsyncFunctionDef(self, node):
        # Apply the exact same logic to async functions
        return self.visit_FunctionDef(node)
        
    def visit_ClassDef(self, node):
        # Recurse into classes so we can prune their internal methods
        self.generic_visit(node)
        return node

def prune_ast(file_path: str) -> str:
    """Reads a Python file, prunes its AST, and calculates telemetry."""
    with open(file_path, "r", encoding="utf-8") as f:
        source = f.read()
    
    original_chars = len(source)
    tree = ast.parse(source)
    
    pruner = ContextPruner()
    pruned_tree = pruner.visit(tree)
    ast.fix_missing_locations(pruned_tree)
    
    # ast.unparse requires Python 3.9+
    pruned_source = ast.unparse(pruned_tree)
    pruned_chars = len(pruned_source)
    
    # Send telemetry to stderr so it doesn't pollute the MCP stdout payload
    reduction_pct = (1 - (pruned_chars / original_chars)) * 100 if original_chars > 0 else 0
    sys.stderr.write(
        f"ContextCut Telemetry: Reduced from {original_chars} to {pruned_chars} "
        f"characters ({reduction_pct:.1f}% reduction).\n"
    )
    
    return pruned_source

if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.stderr.write("Usage: contextcut <file_path>\n")
        sys.exit(1)
    
    target_path = sys.argv[1]
    
    if not os.path.exists(target_path):
        sys.stderr.write(f"Error: Target file not found: {target_path}\n")
        sys.exit(1)
        
    try:
        # Print the pruned code to stdout for the MCP server to capture
        result = prune_ast(target_path)
        print(result)
    except Exception as e:
        sys.stderr.write(f"ContextCut Error during parsing: {str(e)}\n")
        sys.exit(1)