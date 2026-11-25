"""Exit successfully when the console build is current for the Windows launcher."""
from pathlib import Path


def build_inputs(frontend):
    for name in ("index.html", "package.json", "package-lock.json"):
        yield frontend / name
    for pattern in ("vite.config.*", "tsconfig*.json", "postcss.config.*", "tailwind.config.*",
                    ".env", ".env.local", ".env.production", ".env.production.local"):
        yield from frontend.glob(pattern)
    for name in ("src", "public"):
        folder = frontend / name
        if folder.is_dir():
            # Directory timestamps also catch removed or renamed source files.
            yield folder
            yield from folder.rglob("*")


def is_current(frontend):
    try:
        built_at = (frontend / "dist" / "index.html").stat().st_mtime_ns
        return all(item.stat().st_mtime_ns <= built_at for item in build_inputs(frontend))
    except FileNotFoundError:
        return False


if __name__ == "__main__":
    raise SystemExit(0 if is_current(Path(__file__).resolve().parents[1]) else 1)
