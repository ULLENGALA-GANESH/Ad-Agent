import os
import sys
import numpy as np
from data_loader.data_loader import DataLoader
from ad_model_selection.prompts.pygod_ms_prompt import generate_model_selection_prompt_from_pygod
from ad_model_selection.prompts.pyod_ms_prompt import generate_model_selection_prompt_from_pyod
from ad_model_selection.prompts.timeseries_ms_prompt import generate_model_selection_prompt_from_timeseries
from utils.gemini_client import query_gemini

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))


class AgentSelector:

    def __init__(self, user_input):
        self.user_input = user_input
        self.data_path_train = user_input["dataset_train"]
        self.data_path_test = user_input.get("dataset_test")
        self.parameters = user_input.get("parameters", {}) or {}

        # Load datasets
        self._load_data()

        # Detect package type
        self._detect_package()

        # Select algorithm (strict or auto-smart)
        self._select_algorithm()

        # Final output (pipeline expects tools list)
        self.tools = [self.algorithm_name]
        self.vectorstore = None

        print("\n=== Selector Summary ===")
        print(f"[INFO] Package Detected: {self.package_name}")
        print(f"[INFO] Final Algorithm Selected: {self.algorithm_name}")
        print(f"[INFO] Parameters: {self.parameters}\n")

    def _load_data(self):
        train_loader = DataLoader(self.data_path_train)
        self.X_train, self.y_train = train_loader.load_data(split_data=False)

        if self.data_path_test and os.path.exists(self.data_path_test):
            test_loader = DataLoader(self.data_path_test)
            self.X_test, self.y_test = test_loader.load_data(split_data=False)
        else:
            self.X_test = self.X_train
            self.y_test = self.y_train

        self.supervised = (
            isinstance(self.y_train, np.ndarray)
            and set(np.unique(self.y_train)).issubset({0, 1})
        )

    def _detect_package(self):
        # 1. Video modality
        ext = os.path.splitext(self.data_path_train)[1].lower()
        if ext in [".mp4", ".avi", ".mov", ".mkv"]:
            self.package_name = "video"
            return

        # 2. Vision modality
        if ext in [".png", ".jpg", ".jpeg", ".bmp", ".webp"]:
            self.package_name = "vision"
            return

        # 3. Graph dataset → PyGOD
        if hasattr(self.X_train, "num_nodes"):
            self.package_name = "pygod"
            return

        # 4. Time-Series check
        if (isinstance(self.y_train, str) and self.y_train == "time-series") or "sensor" in self.data_path_train.lower() or "pump" in self.data_path_train.lower() or "traffic" in self.data_path_train.lower():
            self.package_name = "darts"
            return

        # 5. Standard tabular input
        if isinstance(self.X_train, np.ndarray):
            self.package_name = "pyod"
            return

        self.package_name = "pyod"

    def _select_algorithm(self):
        algo_list = self.user_input.get("algorithm") or []
        first_algo = algo_list[0] if len(algo_list) > 0 else ""

        # Strict mode if specific model requested and not "all"
        if first_algo and first_algo.lower() != "all":
            self.algorithm_name = first_algo
            return

        # Auto mode: ask Gemini with heuristic fallback
        name = os.path.basename(self.data_path_train)
        choice = None

        try:
            if self.package_name == "pyod":
                size, dim = self.X_train.shape if hasattr(self.X_train, "shape") and len(self.X_train.shape) == 2 else (100, 10)
                prompt_msgs = generate_model_selection_prompt_from_pyod(name, size, dim)
                prompt = "\n".join([msg["content"] for msg in prompt_msgs])
                prompt += "\n\nReturn ONLY JSON: {\"choice\": \"MODEL_NAME\"}"
                raw = query_gemini(prompt)
                choice = self._parse_gemini_choice(raw)

            elif self.package_name == "video":
                choice = "SpatioTemporal-AutoEncoder"
            elif self.package_name == "vision":
                choice = "PatchCore-DefectHeatmap"
        except Exception as e:
            print(f"[Selector] LLM recommendation exception: {e}")

        # Intelligent heuristic defaults
        if not choice:
            if self.package_name == "video":
                choice = "SpatioTemporal-AutoEncoder"
            elif self.package_name == "vision":
                choice = "PatchCore-DefectHeatmap"
            elif self.package_name == "pygod":
                choice = "DOMINANT"
            elif self.package_name == "darts":
                choice = "AutoEncoder-TimeSeries"
            else:
                dim = self.X_train.shape[1] if hasattr(self.X_train, "shape") and len(self.X_train.shape) > 1 else 10
                choice = "ECOD" if dim > 20 else "IForest"

        self.algorithm_name = choice

    def _parse_gemini_choice(self, text: str):
        import json, re
        try:
            cleaned = re.sub(r"```(?:json)?|```", "", text, flags=re.MULTILINE).strip()
            match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
            if match:
                data = json.loads(match.group(0))
                return data.get("choice", None)
        except Exception:
            return None
        return None
