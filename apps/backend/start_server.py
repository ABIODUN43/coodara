import os
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent
repo_root = backend_dir.parent.parent if backend_dir.parent.name == "apps" else backend_dir.parent

if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

def run_migrations() -> None:
    """Run Alembic migrations up to head against the configured DATABASE_URL."""
    from alembic.config import Config
    from alembic import command

    candidates = [
        repo_root / "alembic.ini",
        backend_dir / "alembic.ini",
        Path("alembic.ini").resolve(),
        Path("../alembic.ini").resolve(),
    ]
    alembic_ini = next((p for p in candidates if p.is_file()), None)
    if not alembic_ini:
        raise FileNotFoundError(f"Could not locate alembic.ini in candidate paths: {candidates}")

    print(f"[Coodara Startup] Applying Alembic migrations (config: {alembic_ini})...")
    cfg = Config(str(alembic_ini))
    command.upgrade(cfg, "head")
    print("[Coodara Startup] Database schema migrations completed successfully.")

if __name__ == "__main__":
    is_render = os.environ.get("RENDER") == "true"
    run_mig = os.environ.get("RUN_MIGRATIONS", "").lower() in ("1", "true")

    # Only run migrations if running on Render or explicitly requested via RUN_MIGRATIONS
    # This ensures local development runs do not execute migrations automatically unless desired.
    if is_render or run_mig:
        run_migrations()

    import uvicorn

    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0" if is_render else "127.0.0.1")
    uvicorn.run("main:app", host=host, port=port, reload=False)
