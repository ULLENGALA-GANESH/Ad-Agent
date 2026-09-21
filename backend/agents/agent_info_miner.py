from langchain_core.prompts import PromptTemplate
from datetime import datetime, timedelta
import json
from filelock import FileLock
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from utils.gemini_client import query_gemini
from utils.rag_engine import query_rag_docs, extract_algorithm_parameters


web_search_prompt_pyod = PromptTemplate.from_template("""
You are a machine learning expert researching PyOD algorithm `{algorithm_name}`.
Extract all parameters of the `__init__` method for `{algorithm_name}` with default values as a Python dictionary:
```python
{{
    "contamination": 0.1,
    ...
}}
```
""")

web_search_prompt_pygod = PromptTemplate.from_template("""
You are a machine learning expert researching PyGOD detector `{algorithm_name}`.
Extract all parameters of the `__init__` method for `{algorithm_name}` with default values as a Python dictionary.
""")

web_search_prompt_darts = PromptTemplate.from_template("""
You are a machine learning expert researching Darts forecasting model `{algorithm_name}`.
Extract all initialization parameters for `{algorithm_name}` with default values as a Python dictionary.
""")


class AgentInfoMiner:
    def __init__(self):
        pass

    def query_docs(self, algorithm, vectorstore=None, package_name="pyod", cache_path="cache.json"):
        """Search for relevant documentation using Local RAG with Gemini augmentation and thread-safe caching."""
        if package_name in ["video", "vision"]:
            return f"Specialized production pipeline for {package_name} anomaly intelligence and spatial-temporal localization."

        lock_path = cache_path + ".lock"
        lock = FileLock(lock_path)

        if not os.path.exists(cache_path):
            with open(cache_path, "w", encoding="utf-8") as f:
                json.dump({}, f)

        # Step 1: Check cache
        with lock:
            with open(cache_path, "r", encoding="utf-8") as f:
                try:
                    cache = json.load(f)
                except Exception:
                    cache = {}

            if algorithm in cache:
                try:
                    cached_time = datetime.fromisoformat(cache[algorithm]["query_datetime"])
                    if datetime.now() - cached_time < timedelta(days=7):
                        return cache[algorithm]["document"]
                except Exception:
                    pass

        # Step 2: Ground with Local RAG first (High precision, zero latency)
        rag_doc = query_rag_docs(algorithm, package_name)

        # Step 3: Try Gemini augmentation if available
        algorithm_doc = None
        try:
            prompt_temp = (
                web_search_prompt_pyod if package_name == "pyod"
                else web_search_prompt_pygod if package_name == "pygod"
                else web_search_prompt_darts
            )
            prompt = prompt_temp.invoke({"algorithm_name": algorithm}).to_string()
            prompt += f"\n\nReference excerpt:\n{rag_doc[:1000]}"
            llm_res = query_gemini(prompt)
            if llm_res and not llm_res.startswith("[Error]"):
                algorithm_doc = llm_res + "\n\n" + rag_doc
        except Exception as e:
            print(f"[InfoMiner] LLM doc query note: {e}")

        if not algorithm_doc:
            algorithm_doc = rag_doc

        # Step 4: Update cache
        with lock:
            with open(cache_path, "r", encoding="utf-8") as f:
                try:
                    cache = json.load(f)
                except Exception:
                    cache = {}

            cache[algorithm] = {
                "query_datetime": datetime.now().isoformat(),
                "document": algorithm_doc
            }
            with open(cache_path, "w", encoding="utf-8") as f:
                json.dump(cache, f, ensure_ascii=False, indent=2)

        return algorithm_doc


if __name__ == "__main__":
    agent = AgentInfoMiner()
    doc = agent.query_docs("IForest", None, "pyod")
    print("Doc retrieved length:", len(doc))