import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from project root
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)
load_dotenv()

class Config:
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
