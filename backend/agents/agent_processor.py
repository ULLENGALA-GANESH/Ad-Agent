"""
AgentProcessor - Few-shot CoT Extraction (API Mode)
--------------------------------------------------
Uses Gemini to extract:
- algorithm (list)
- dataset_train (string)
- dataset_test (string)
- parameters (object)

If dataset_test is missing → dataset_test = dataset_train
If algorithm is missing → algorithm=["all"] (Selector will decide best model)
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
        # Example 1
        {"role": "user", "content": "Run IForest on ./data/train.mat and ./data/test.mat with contamination=0.1"},
        {"role": "assistant", "content":
            'FINAL: {"algorithm":["IForest"],"dataset_train":"./data/train.mat","dataset_test":"./data/test.mat","parameters":{"contamination":0.1}}'
        },
        # Example 2
        {"role": "user", "content": "Run LOF"},
        {"role": "assistant", "content":
            'FINAL: {"algorithm":["LOF"],"dataset_train":null,"dataset_test":null,"parameters":{}}'
        },
        # User Placeholder
        {"role": "user", "content": "USER_INSTRUCTION:\n<START>\n{user_input}\n<END>"}
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

    def extract_config(self, user_input: str) -> dict:
        prompt = [dict(p) for p in self.FEW_SHOT_COT_PROMPT]
        prompt[-1]["content"] = prompt[-1]["content"].format(user_input=user_input)

        response = ""
        try:
            response = self._call_gemini(prompt)
            print("\n=== Gemini Extraction ===\n", response, "\n")
        except Exception as e:
            print(f"[Processor] Gemini extraction unavailable: {e}. Using rule-based fallback.")

        match = re.search(r"FINAL:\s*(\{.*\})", response, flags=re.DOTALL) if response else None
        if match:
            try:
                parsed = json.loads(match.group(1))
            except Exception:
                print("[Processor] JSON parse error.")
                parsed = {}
        else:
            # Rule-based fallback extraction
            known_algos = [
                "IForest", "ECOD", "COPOD", "LOF", "KNN", "CBLOF", "HBOS",
                "PCA", "OCSVM", "MCD", "SOD", "AutoEncoder", "DeepSVDD", "ALAD",
                "TFT", "NBEATS", "TSMixer", "RNNModel"
            ]
            detected_algos = []
            for alg in known_algos:
                if re.search(r"\b" + re.escape(alg) + r"\b", user_input, re.IGNORECASE):
                    detected_algos.append(alg)

            # Find paths in input
            path_matches = re.findall(r"[\./\w\\-]+\.(?:csv|mat|npy|pt|json|xlsx)", user_input)
            train_path = path_matches[0] if len(path_matches) > 0 else None
            test_path = path_matches[1] if len(path_matches) > 1 else None

            # Find parameters like contamination=0.1
            params = {}
            param_matches = re.findall(r"(\w+)\s*=\s*([0-9\.]+)", user_input)
            for k, v in param_matches:
                try:
                    params[k] = float(v) if "." in v else int(v)
                except ValueError:
                    params[k] = v

            parsed = {
                "algorithm": detected_algos if detected_algos else ["all"],
                "dataset_train": train_path,
                "dataset_test": test_path,
                "parameters": params,
            }

        # Clean paths
        def clean(x):
            return os.path.normpath(x) if isinstance(x, str) else x

        parsed["dataset_train"] = clean(parsed.get("dataset_train"))
        parsed["dataset_test"] = clean(parsed.get("dataset_test"))

        return parsed

    def process_command(self, cmd: str) -> dict:
        parsed = self.extract_config(cmd)

        # ✅ If algorithm missing → let selector decide best one
        if not parsed.get("algorithm"):
            parsed["algorithm"] = ["all"]

        train = parsed.get("dataset_train")
        test = parsed.get("dataset_test")

        # ✅ NEW: If no test dataset → use train dataset as test dataset
        if not test or str(test).lower() in ["", "none", "null"]:
            print("[Processor] No test dataset provided → using training dataset for evaluation.")
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
