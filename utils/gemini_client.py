# utils/gemini_client.py

import time

from google import genai
from google.api_core import exceptions

from config.config import Config


# ============================================================
# Gemini API setup
# ============================================================

API_KEY = Config.GEMINI_API_KEY
MODEL_NAME = "gemini-3.6-flash"
client = genai.Client(api_key=API_KEY) if API_KEY else None


def _require_client():
    if client is None:
        raise RuntimeError("GEMINI_API_KEY is not configured")
    return client


# ============================================================
# Basic Gemini query
# ============================================================

def query_gemini(prompt: str, temperature: float = 0.3) -> str:
    """
    Basic Gemini API call.
    """

    response = _require_client().models.generate_content(
        model=MODEL_NAME,
        contents=prompt,
        config={
            "temperature": temperature,
        },
    )

    if response and response.text:
        return response.text.strip()

    return ""


# ============================================================
# Quota-aware / retry-safe Gemini query
# ============================================================

def query_gemini_quota_safe(
    prompt: str,
    temperature: float = 0.3,
    retries: int = 3,
    delay: int = 10,
) -> str:
    """
    Gemini query with retry handling for quota,
    timeout, and temporary API errors.
    """

    if client is None:
        return "[Error] GEMINI_API_KEY is not configured."

    for attempt in range(retries):

        try:

            response = _require_client().models.generate_content(
                model=MODEL_NAME,
                contents=prompt,
                config={
                    "temperature": temperature,
                },
            )

            if response and response.text:
                return response.text.strip()

            return "[Error] Gemini returned empty response."

        except exceptions.ResourceExhausted:

            print(
                f"[Gemini] ⚠️ Quota exhausted. "
                f"Waiting {delay}s before retry "
                f"{attempt + 1}/{retries}..."
            )

            time.sleep(delay)

        except exceptions.DeadlineExceeded:

            print(
                f"[Gemini] ⏳ Timeout. "
                f"Retrying ({attempt + 1}/{retries})..."
            )

            time.sleep(delay)

        except Exception as e:
            if "GEMINI_API_KEY" in str(e) or "API_KEY_INVALID" in str(e):
                return f"[Error] {e}"

            print(
                f"[Gemini] Unexpected error: {e}. "
                f"Retrying ({attempt + 1}/{retries})..."
            )

            time.sleep(delay)

    return "[Error] Gemini request failed after retries."


# ============================================================
# Backward-compatible alias
# ============================================================

query_gemini_with_retry = query_gemini_quota_safe