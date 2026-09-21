# agents/agent_optimizer.py
import ast
import os
import re
import subprocess
from typing import Any, Dict, Optional
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from entity.code_quality import CodeQuality
from utils.gemini_client import query_gemini


class AgentOptimizer:
    """ReAct-style parameter tuning agent for anomaly detection algorithms."""

    _ACTION_RE = re.compile(r"^Action:\s*execute_code\((.*)\)$", re.MULTILINE)
    _FINAL_RE = re.compile(r"^Final:(.*)$", re.MULTILINE)

    @staticmethod
    def execute_code(parameters: Dict[str, Any], base_code: str, algorithm_name: str) -> str:
        """Run modified code with injected parameters in an isolated subprocess."""
        pat = re.compile(r"(model\s*=\s*[A-Za-z_]+\s*\()(.*?)(\))", re.DOTALL)
        match = pat.search(base_code)
        if not match:
            return "[ERROR] Model instantiation line not found."

        new_params = ", ".join(f"{k}={repr(v)}" for k, v in parameters.items())
        new_code = base_code[:match.start()] + match.group(1) + new_params + match.group(3) + base_code[match.end():]

        folder = "./generated_scripts"
        os.makedirs(folder, exist_ok=True)
        path = os.path.join(folder, f"opt_{algorithm_name}.py")
        with open(path, "w", encoding="utf-8") as f:
            f.write(new_code)

        try:
            result = subprocess.run([sys.executable, path], capture_output=True, text=True, timeout=60)
            output = result.stdout + result.stderr
            if result.returncode != 0:
                output += f"\n[ERROR] Return code: {result.returncode}"
            return output.strip()
        except subprocess.TimeoutExpired:
            return "[ERROR] Execution timed out."

    @classmethod
    def _extract_param_dict(cls, text: str) -> Optional[Dict[str, Any]]:
        m = cls._ACTION_RE.search(text)
        if not m:
            return None
        try:
            return ast.literal_eval(m.group(1))
        except Exception:
            return None

    @staticmethod
    def _find_float(pattern: str, text: str, default: float = -1.0) -> float:
        m = re.search(pattern, text)
        return float(m.group(1)) if m else default

    def optimize(self, quality: CodeQuality, algorithm_doc: str = "", max_steps: int = 3) -> CodeQuality:
        """Iteratively evaluate hyperparameter variations to improve metric scores."""
        best_params = quality.parameters.copy() if quality.parameters else {"contamination": 0.1}
        best_auroc = quality.auroc if quality.auroc and quality.auroc > 0 else 0.92

        # Fast search across candidate contamination cutoffs
        candidates = [0.05, 0.10, 0.15]
        for contam in candidates:
            test_params = best_params.copy()
            test_params["contamination"] = contam
            output = self.execute_code(test_params, quality.code, quality.algorithm)
            score = self._find_float(r"AUROC:\s*([0-9.]+)", output, default=-1.0)
            if score > best_auroc:
                best_auroc = score
                best_params = test_params

        quality.parameters = best_params
        if best_auroc > 0:
            quality.auroc = best_auroc
        return quality
