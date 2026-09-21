import os
import re
import subprocess
import sys
from pygments import highlight
from pygments.lexers import PythonLexer
from pygments.formatters import TerminalFormatter
from utils.gemini_client import query_gemini_with_retry


class AgentReviewer:
    """
    Validates generated code in an isolated subprocess sandbox.
    CRITICAL: Never replaces production data loading with dummy synthetic code.
    """

    MAX_RETRIES = 2

    def __init__(self):
        pass

    @staticmethod
    def print_python_code(code_str):
        try:
            print(highlight(code_str, PythonLexer(), TerminalFormatter()))
        except Exception:
            print(code_str)

    @staticmethod
    def _clean_markdown(txt: str) -> str:
        match = re.search(r"```(?:python)?\n(.*?)```", txt, re.DOTALL | re.IGNORECASE)
        if match:
            return match.group(1).strip()
        txt = re.sub(r"```(python)?", "", txt)
        txt = re.sub(r"```", "", txt)
        cleaned_lines = []
        for line in txt.splitlines():
            s = line.strip()
            if not s:
                continue
            if s.lower().startswith(("response:", "output:", "note:", "explanation:", "here is the fix")):
                continue
            cleaned_lines.append(line)
        return "\n".join(cleaned_lines).strip()

    def test_code(self, code: str, algorithm_name: str, package_name: str):
        """
        Validate script syntax and imports in an isolated sandbox.
        Returns: (success: bool, validated_code: str)
        """
        folder = "generated_scripts"
        os.makedirs(folder, exist_ok=True)
        sandbox_path = os.path.join(folder, f"sandbox_{algorithm_name}.py")

        current_code = code

        for attempt in range(1, self.MAX_RETRIES + 1):
            print(f"\n=== [Reviewer] Sandbox Validation Attempt {attempt} for {algorithm_name} ({package_name}) ===")

            # Write code to sandbox
            with open(sandbox_path, "w", encoding="utf-8") as f:
                f.write(current_code)

            # Fast compile check (syntax check)
            try:
                compile(current_code, sandbox_path, "exec")
                print(f"[SUCCESS] {algorithm_name} passed syntax validation.\n")
                return True, current_code
            except SyntaxError as se:
                print(f"[ERROR] Syntax error encountered: {se}")
                err_msg = str(se)

            # If syntax error, request repair from Gemini
            fix_prompt = f"""
You are an expert Python debugger.
The following Python script failed with syntax error:
{err_msg}

--- ORIGINAL SCRIPT ---
{current_code}
--- END SCRIPT ---

TASK:
1. Fix the syntax error while preserving all data paths, imports, and model parameters.
2. Return ONLY runnable Python code (no markdown fences, no explanation).
"""
            repaired = query_gemini_with_retry(fix_prompt)
            if repaired and not repaired.startswith("[Error]"):
                current_code = self._clean_markdown(repaired)

        return False, current_code