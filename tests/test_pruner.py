#!/usr/bin/env python3
"""
Unit tests for ContextCut AST Pruning Engine.
"""

import os
import sys
import unittest
import tempfile
import shutil

# Add python_engine to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "python_engine")))

from contextcut import (
    prune_code_string,
    prune_file,
    prune_directory,
    prune_target,
    estimate_tokens,
    calculate_cost_savings,
    record_telemetry_event,
)


class TestContextPruner(unittest.TestCase):

    def test_basic_function_pruning(self):
        source = '''
def calculate_tax(amount: float, rate: float = 0.05) -> float:
    """Calculates tax on an amount."""
    if amount < 0:
        raise ValueError("Invalid amount")
    return amount * rate
'''
        pruned, orig_c, pruned_c = prune_code_string(source, keep_docstrings=True)
        self.assertIn("def calculate_tax(amount: float, rate: float=0.05) -> float:", pruned)
        self.assertIn('"""Calculates tax on an amount."""', pruned)
        self.assertIn("pass", pruned)
        self.assertNotIn("raise ValueError", pruned)
        self.assertNotIn("return amount * rate", pruned)
        self.assertLess(pruned_c, orig_c)

    def test_async_function_pruning(self):
        source = '''
async def fetch_user_data(user_id: int) -> dict:
    """Async fetch user profile."""
    await some_db_call(user_id)
    return {"id": user_id}
'''
        pruned, orig_c, pruned_c = prune_code_string(source, keep_docstrings=True)
        self.assertIn("async def fetch_user_data(user_id: int) -> dict:", pruned)
        self.assertIn('"""Async fetch user profile."""', pruned)
        self.assertIn("pass", pruned)
        self.assertNotIn("some_db_call", pruned)

    def test_class_and_method_pruning(self):
        source = '''
class UserService:
    """Handles user operations."""
    service_name: str = "UserAuth"

    def __init__(self, db_conn):
        self.db = db_conn
        self._init_cache()

    def get_user(self, uid: str) -> dict:
        """Retrieves user by ID."""
        data = self.db.query(uid)
        return data
'''
        pruned, orig_c, pruned_c = prune_code_string(source, keep_docstrings=True)
        self.assertIn("class UserService:", pruned)
        self.assertIn('"""Handles user operations."""', pruned)
        self.assertIn("service_name: str = 'UserAuth'", pruned)
        self.assertIn("def __init__(self, db_conn):", pruned)
        self.assertIn("def get_user(self, uid: str) -> dict:", pruned)
        self.assertIn('"""Retrieves user by ID."""', pruned)
        self.assertNotIn("self._init_cache()", pruned)
        self.assertNotIn("self.db.query(uid)", pruned)

    def test_minimal_depth_strips_docstrings(self):
        source = '''
def send_email(to: str, subject: str) -> bool:
    """Sends an email notification."""
    return True
'''
        pruned, orig_c, pruned_c = prune_code_string(source, keep_docstrings=False)
        self.assertIn("def send_email(to: str, subject: str) -> bool:", pruned)
        self.assertNotIn("Sends an email notification", pruned)
        self.assertIn("pass", pruned)

    def test_syntax_error_graceful_handling(self):
        source = "def broken_func(:\n    pass"
        pruned, orig_c, pruned_c = prune_code_string(source, keep_docstrings=True)
        self.assertIn("ContextCut Warning: SyntaxError", pruned)
        self.assertIn("broken_func", pruned)

    def test_telemetry_metrics(self):
        result = prune_target(
            code_content='''
def big_workload():
    """Docstring."""
    x = [i ** 2 for i in range(1000)]
    return sum(x)
''',
            depth="interfaces_only",
            include_telemetry=True,
        )
        self.assertIn("[ContextCut Telemetry]", result["output"])
        self.assertGreater(result["saved_tokens"], 0)
        self.assertGreaterEqual(result["cost_saved_usd"], 0.0)
        self.assertGreater(result["reduction_pct"], 0.0)

    def test_directory_pruning(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            file1 = os.path.join(tmpdir, "mod_a.py")
            file2 = os.path.join(tmpdir, "mod_b.py")
            non_py = os.path.join(tmpdir, "ignore.txt")

            with open(file1, "w") as f:
                f.write('def func_a():\n    """Doc A."""\n    return 42\n')
            with open(file2, "w") as f:
                f.write('def func_b():\n    """Doc B."""\n    return 99\n')
            with open(non_py, "w") as f:
                f.write('some non python text')

            combined, orig_c, pruned_c, count = prune_directory(tmpdir, glob_pattern="*.py")
            self.assertEqual(count, 2)
            self.assertIn("mod_a.py", combined)
            self.assertIn("mod_b.py", combined)
            self.assertNotIn("ignore.txt", combined)
            self.assertIn("def func_a():", combined)
            self.assertIn("def func_b():", combined)

    def test_record_telemetry_event(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            test_history_file = os.path.join(tmpdir, "history.jsonl")
            orig_env = os.environ.get("CONTEXTCUT_HISTORY_FILE")
            os.environ["CONTEXTCUT_HISTORY_FILE"] = test_history_file

            try:
                res = {
                    "files_count": 1,
                    "orig_chars": 1000,
                    "pruned_chars": 250,
                    "orig_tokens": 250,
                    "pruned_tokens": 62,
                    "saved_tokens": 188,
                    "cost_saved_usd": 0.000564,
                }
                record_telemetry_event(res, target_label="src/my_module.py")

                self.assertTrue(os.path.exists(test_history_file))
                with open(test_history_file, "r") as f:
                    content = f.read()
                self.assertIn("src/my_module.py", content)
                self.assertIn('"savedTokens": 188', content)
                self.assertIn('"lang": "python"', content)
            finally:
                if orig_env is not None:
                    os.environ["CONTEXTCUT_HISTORY_FILE"] = orig_env
                else:
                    os.environ.pop("CONTEXTCUT_HISTORY_FILE", None)


if __name__ == "__main__":
    unittest.main()
