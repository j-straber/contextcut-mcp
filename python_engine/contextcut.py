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
    """
    Visits the Abstract Syntax Tree (AST) of a Python file and replaces 
    the bodies of all functions and methods with a 'pass' statement, 
    retaining only the docstring if one exists.
    """
    def visit_FunctionDef(self, node):
        docstring = ast.get_docstring(node)
        new_body = []
        
        if docstring:
            new_body.append(ast.Expr(value=ast.Constant(value=docstring)))
            
        new_body.append(ast.Pass())
        node.body = new_body
        return node

    def visit_AsyncFunctionDef(self, node):
        return self.visit_FunctionDef(node)
        
    def visit_ClassDef(self, node):
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
    
    pruned_source = ast.unparse(pruned_tree)
    pruned_chars = len(pruned_source)
    
    # Calculate telemetry metrics
    saved_chars = original_chars - pruned_chars
    orig_tokens_est = original_chars // 4
    pruned_tokens_est = pruned_chars // 4
    saved_tokens_est = saved_chars // 4
    pct_saved = (saved_chars / original_chars * 100) if original_chars > 0 else 0

    # Inject a clean telemetry header comment into the code payload
    telemetry_header = f'''"""
[ContextCut Telemetry]
----------------------------------------
Original Size:  {original_chars:,} chars (~{orig_tokens_est:,} tokens)
Pruned Size:    {pruned_chars:,} chars (~{pruned_tokens_est:,} tokens)
Token Savings:  {pct_saved:.1f}% reduction (~{saved_tokens_est:,} tokens saved)
----------------------------------------
"""

'''
    return telemetry_header + pruned_source

if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.stderr.write("Usage: contextcut <file_path>\n")
        sys.exit(1)
    
    target_path = sys.argv[1]
    
    if not os.path.exists(target_path):
        sys.stderr.write(f"Error: Target file not found: {target_path}\n")
        sys.exit(1)
        
    try:
        result = prune_ast(target_path)
        print(result)
    except Exception as e:
        sys.stderr.write(f"ContextCut Error during parsing: {str(e)}\n")
        sys.exit(1)