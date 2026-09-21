"""
AgentProcessor - Hybrid LLM & Deterministic Parameter Extraction
--------------------------------------------------------------
Extracts:
- algorithm (list)
- dataset_train (string)
- dataset_test (string)
- parameters (dict)
"""

import os
import re
import json
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils.gemini_client import query_gemini


class AgentProcessor:

    FEW_SHOT_COT_PROMPT = [
        {
            "role": "system",
            "content": (
                "You are an extraction assistant. "
                "Read USER_INSTRUCTION and return four fields as JSON:\n"
                "algorithm (array), dataset_train, dataset_test, parameters (object).\n"
                "Think step-by-step, THEN output one line starting with FINAL: {...}\n"
                "Do not invent values. Only return what is explicitly stated."
            ),
        },
        {"role": "user", "content": "Run IForest on ./data/train.mat and ./data/test.mat with contamination=0.1"},
        {"role": "assistant", "content":
            'FINAL: {"algorithm":["IForest"],"dataset_train":"./data/train.mat","dataset_test":"./data/test.mat","parameters":{"contamination":0.1}}'
        },
        {"role": "user", "content": "Run LOF"},
        {"role": "assistant", "content":
            'FINAL: {"algorithm":["LOF"],"dataset_train":null,"dataset_test":null,"parameters":{}}'
        },
        {"role": "user", "content": "USER_INSTRUCTION:\n<START>\n{user_input}\n<END>"}
    ]

    KNOWN_ALGORITHMS = [
        "IForest", "IsolationForest", "ECOD", "COPOD", "LOF", "LocalOutlierFactor",
        "DeepSVDD", "KNN", "HBOS", "PCA", "AutoEncoder", "VAE", "LUNAR", "MCD", "OCSVM",
        "DOMINANT", "SCAN", "GAAN", "GUIDE", "ANEMONE", "CoLA",
        "DLinear", "NBEATSModel", "RNNModel", "TCNModel", "PatchTST", "LightTS",
        "PatchCore", "PaDiM", "EfficientAD", "PatchCore-DefectHeatmap",
        "SpatioTemporal-AutoEncoder", "OpticalFlow-Drift", "AutoEncoder-TimeSeries"
    ]

    def __init__(self):
        self.experiment_config = {
            "algorithm": [],
            "dataset_train": None,
            "dataset_test": None,
            "parameters": {},
        }

    def _call_gemini(self, prompt_list):
        prompt_text = ""
        for msg in prompt_list:
            role = msg["role"]
            content = msg["content"]
            if role == "system":
                prompt_text += f"{content}\n\n"
            elif role == "user":
                prompt_text += f"User: {content}\n"
            else:
                prompt_text += f"Assistant: {content}\n"
        return query_gemini(prompt_text).strip()

    def _heuristic_extract(self, user_input: str) -> dict:
        """Fallback rule-based extraction if LLM is offline or rate-limited."""
        cfg = {"algorithm": [], "dataset_train": None, "dataset_test": None, "parameters": {}}
        
        # Detect algorithm
        for algo in self.KNOWN_ALGORITHMS:
            if re.search(rf"\b{algo}\b", user_input, re.IGNORECASE):
                # Normalize common naming
                std_algo = "IForest" if algo.lower() in ["iforest", "isolationforest"] else algo
                cfg["algorithm"].append(std_algo)
                break

        # Detect parameters e.g. contamination=0.1 or n_estimators=100
        param_matches = re.findall(r"([a-zA-Z_]+)\s*=\s*([0-9.]+)", user_input)
        for k, v in param_matches:
            try:
                cfg["parameters"][k] = float(v) if "." in v else int(v)
            except ValueError:
                cfg["parameters"][k] = v

        # Detect file paths with valid extensions (including video & vision)
        path_matches = re.findall(r"([a-zA-Z0-9_\-\./\\]+\.(?:csv|mat|pt|npy|png|jpg|jpeg|tsv|parquet|txt|mp4|avi|mov|mkv))", user_input, re.IGNORECASE)
        if len(path_matches) >= 1:
            cfg["dataset_train"] = path_matches[0]
        if len(path_matches) >= 2:
            cfg["dataset_test"] = path_matches[1]

        return cfg

    def extract_config(self, user_input: str) -> dict:
        parsed = {}
        from config.config import Config
        gemini_key = getattr(Config, "GEMINI_API_KEY", "") or os.getenv("GEMINI_API_KEY", "")
        if not gemini_key:
            return self._heuristic_extract(user_input)

        try:
            prompt = [dict(p) for p in self.FEW_SHOT_COT_PROMPT]
            prompt[-1]["content"] = prompt[-1]["content"].format(user_input=user_input)

            response = self._call_gemini(prompt)
            if response and not response.startswith("[Error]"):
                match = re.search(r"FINAL:\s*(\{.*\})", response, flags=re.DOTALL)
                if match:
                    parsed = json.loads(match.group(1))
        except Exception as e:
            print(f"[Processor] LLM extraction error: {e}")

        # Fallback to heuristic parser if LLM extraction returned empty
        if not parsed or not parsed.get("algorithm"):
            fallback = self._heuristic_extract(user_input)
            if fallback.get("algorithm") or fallback.get("parameters"):
                parsed.update(fallback)

        def clean(x):
            return os.path.normpath(x) if isinstance(x, str) else x

        if "dataset_train" in parsed:
            parsed["dataset_train"] = clean(parsed.get("dataset_train"))
        if "dataset_test" in parsed:
            parsed["dataset_test"] = clean(parsed.get("dataset_test"))

        return parsed

    def process_command(self, cmd: str) -> dict:
        parsed = self.extract_config(cmd)

        if not parsed.get("algorithm"):
            parsed["algorithm"] = ["all"]

        train = parsed.get("dataset_train")
        test = parsed.get("dataset_test")

        if not test or str(test).lower() in ["", "none", "null"]:
            test = train

        self.experiment_config.update({
            "algorithm": parsed.get("algorithm", []),
            "dataset_train": train,
            "dataset_test": test,
            "parameters": parsed.get("parameters", {}),
        })

        print("\n=== Processor Output ===")
        print(self.experiment_config, "\n")
        return self.experiment_config
