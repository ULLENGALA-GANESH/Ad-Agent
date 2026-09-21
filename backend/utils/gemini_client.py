# utils/gemini_client.py

import os
import time
import google.generativeai as genai
from google.api_core import exceptions
from config.config import Config

# Retrieve API key with fallbacks
api_key = getattr(Config, "GEMINI_API_KEY", "") or os.getenv("GEMINI_API_KEY", "")
if api_key:
    genai.configure(api_key=api_key)

MODELS = ["gemini-1.5-flash", "gemini-2.0-flash"]
PRIMARY_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")


def query_gemini(prompt: str, temperature: float = 0.2, model_name: str = None) -> str:
    """
    Standard Gemini query with automated model fallback and clean output.
    """
    current_key = getattr(Config, "GEMINI_API_KEY", "") or os.getenv("GEMINI_API_KEY", "")
    if not current_key:
        return "[Error] GEMINI_API_KEY not configured"

    models_to_try = [model_name] if model_name else [PRIMARY_MODEL, "gemini-1.5-flash"]
    for m in models_to_try:
        try:
            model = genai.GenerativeModel(m)
            response = model.generate_content(
                prompt,
                generation_config={"temperature": temperature},
                request_options={"timeout": 5.0}
            )
            if response and response.text:
                return response.text.strip()
        except Exception:
            continue

    return "[Error] Gemini invocation failed"


def query_gemini_quota_safe(prompt: str, temperature: float = 0.2, retries: int = 3, delay: int = 5) -> str:
    """
    Robust retry logic with exponential backoff for rate limits and transient errors.
    """
    for attempt in range(retries):
        try:
            res = query_gemini(prompt, temperature=temperature)
            if res and not res.startswith("[Error]"):
                return res
            time.sleep(delay)
        except exceptions.ResourceExhausted:
            print(f"[Gemini] ⚠️ Quota limit. Waiting {delay}s (Attempt {attempt+1}/{retries})...")
            time.sleep(delay * (attempt + 1))
        except Exception as e:
            print(f"[Gemini] Transient error: {e}. Retrying ({attempt+1}/{retries})...")
            time.sleep(delay)

    return query_gemini(prompt, temperature=temperature)


def query_gemini_vision(image_path: str, prompt: str) -> str:
    """
    Multimodal VLM inspection: Analyze an image/frame for anomalies and defect localization.
    """
    try:
        from PIL import Image
        img = Image.open(image_path)
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content([prompt, img])
        return response.text.strip() if response and response.text else ""
    except Exception as e:
        return f"[Error] Vision analysis failed: {str(e)}"


query_gemini_with_retry = query_gemini_quota_safe
