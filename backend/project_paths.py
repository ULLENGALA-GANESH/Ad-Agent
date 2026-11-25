"""Shared repository paths for the API, worker, and research scripts."""
import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent
DATA_DIR = PROJECT_ROOT / "data"


def research_script_env():
    """Keep backend modules importable in scripts generated outside the source tree."""
    env = os.environ.copy()
    paths = [str(BACKEND_DIR)]
    if env.get("PYTHONPATH"):
        paths.append(env["PYTHONPATH"])
    env["PYTHONPATH"] = os.pathsep.join(paths)
    return env
