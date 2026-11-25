import os
from dotenv import load_dotenv
from project_paths import PROJECT_ROOT

# Load .env file from project root
env_path = PROJECT_ROOT / ".env"
load_dotenv(dotenv_path=env_path)
load_dotenv()

class Config:
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
