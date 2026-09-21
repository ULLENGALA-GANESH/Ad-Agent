import os
from dotenv import load_dotenv

# Load .env file if available
load_dotenv()


class Config:
    """Central configuration for AD-AGENT Enterprise."""
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    JWT_SECRET = os.getenv("JWT_SECRET", "ad_agent_enterprise_secret_key_2025_prod")
    PORT = int(os.getenv("PORT", 8000))
