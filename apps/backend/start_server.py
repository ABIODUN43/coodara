"""
Coodara Production Startup Script for Render Free.

Execution Sequence:
1. Locate and apply Alembic database schema migrations (`alembic upgrade head`).
2. Start the existing Celery worker (`app.workers.celery_app`) as a managed child process
   with concurrency=1 (respects Render Free memory bounds).
3. Verify that the Celery worker process started successfully and is actively running.
   If Celery fails or exits immediately, fail fast with a non-zero exit code so Render
   marks the deployment unhealthy rather than starting Uvicorn without background processing.
4. Start Uvicorn ASGI web server in the foreground on 0.0.0.0:$PORT.
5. On shutdown (SIGTERM/SIGINT), gracefully terminate the Celery worker process.
"""

from __future__ import annotations

import atexit
import os
import signal
import subprocess
import sys
import time
from pathlib import Path

backend_dir = Path(__file__).resolve().parent
repo_root = backend_dir.parent.parent if backend_dir.parent.name == "apps" else backend_dir.parent

if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))


def run_migrations() -> None:
    """Run Alembic migrations up to head against the configured DATABASE_URL."""
    from alembic import command
    from alembic.config import Config

    candidates = [
        repo_root / "alembic.ini",
        backend_dir / "alembic.ini",
        Path("alembic.ini").resolve(),
        Path("../alembic.ini").resolve(),
        Path("../../alembic.ini").resolve(),
    ]
    alembic_ini = next((p for p in candidates if p.is_file()), None)
    if not alembic_ini:
        raise FileNotFoundError(f"Could not locate alembic.ini in candidate paths: {candidates}")

    print(f"[Coodara Startup] Step 1/3: Applying Alembic migrations (config: {alembic_ini})...")
    cfg = Config(str(alembic_ini))
    command.upgrade(cfg, "head")
    print("[Coodara Startup] Database schema migrations completed successfully.")


def start_celery_worker() -> subprocess.Popen[str]:
    """
    Start the existing Celery application as an independent background child process.
    Uses concurrency=1 to fit within Render Free's 512 MB memory budget.
    """
    # Windows requires the solo pool; Linux / Render uses 1 prefork worker
    pool_args = ["-P", "solo"] if sys.platform == "win32" else ["-c", "1"]
    cmd = [
        sys.executable,
        "-m",
        "celery",
        "-A",
        "app.workers.celery_app",
        "worker",
        "--loglevel=info",
    ] + pool_args

    print(f"[Coodara Startup] Step 2/3: Starting Celery worker ({' '.join(cmd)})...")
    try:
        proc = subprocess.Popen(
            cmd,
            cwd=str(backend_dir),
            env=os.environ.copy(),
            text=True,
        )
    except Exception as exc:
        print(f"[Coodara Startup] FATAL: Failed to launch Celery worker process: {exc}", file=sys.stderr)
        raise

    # Verify process didn't terminate immediately (e.g. missing dependency or syntax error)
    time.sleep(2.0)
    exit_code = proc.poll()
    if exit_code is not None:
        raise RuntimeError(
            f"Celery worker process terminated immediately upon startup with exit code {exit_code}."
        )

    print(f"[Coodara Startup] Celery worker started and verified running (PID: {proc.pid}).")
    return proc


def stop_celery_worker(proc: subprocess.Popen[str] | None) -> None:
    """Gracefully terminate the Celery worker child process."""
    if proc is None or proc.poll() is not None:
        return

    print(f"[Coodara Shutdown] Sending SIGTERM to Celery worker (PID: {proc.pid})...")
    try:
        proc.terminate()
        try:
            proc.wait(timeout=10)
            print("[Coodara Shutdown] Celery worker terminated gracefully.")
        except subprocess.TimeoutExpired:
            print("[Coodara Shutdown] Celery worker did not exit in 10s. Forcing SIGKILL...", file=sys.stderr)
            proc.kill()
            proc.wait(timeout=5)
            print("[Coodara Shutdown] Celery worker killed.")
    except Exception as exc:
        print(f"[Coodara Shutdown] Warning: Error during Celery worker cleanup: {exc}", file=sys.stderr)


if __name__ == "__main__":
    is_render = os.environ.get("RENDER") == "true"
    run_mig = is_render or os.environ.get("RUN_MIGRATIONS", "").lower() in ("1", "true")
    run_worker = (
        is_render or os.environ.get("RUN_WORKER", "").lower() in ("1", "true")
    ) and os.environ.get("DISABLE_WORKER", "").lower() not in ("1", "true")

    # Step 1: Database migrations
    if run_mig:
        try:
            run_migrations()
        except Exception as mig_exc:
            print(f"[Coodara Startup] FATAL: Database migrations failed: {mig_exc}", file=sys.stderr)
            sys.exit(1)

    # Step 2: Celery worker
    worker_proc: subprocess.Popen[str] | None = None
    if run_worker:
        redis_url = os.environ.get("REDIS_URL") or os.environ.get("CELERY_BROKER_URL")
        if not redis_url:
            msg = (
                "[Coodara Startup] FATAL: Neither REDIS_URL nor CELERY_BROKER_URL is configured. "
                "The Celery worker requires Redis in production."
            )
            print(msg, file=sys.stderr)
            if is_render:
                # In Render production, terminate deployment so it is marked unhealthy
                sys.exit(1)
            else:
                print("[Coodara Startup] Non-production environment: continuing without worker.", file=sys.stderr)
        else:
            try:
                worker_proc = start_celery_worker()
            except Exception as worker_exc:
                print(
                    f"[Coodara Startup] FATAL: Celery worker failed to start or exited immediately: {worker_exc}",
                    file=sys.stderr,
                )
                if is_render:
                    # In Render production, terminate deployment so it is marked unhealthy
                    # rather than starting Uvicorn without the background worker
                    sys.exit(1)
                else:
                    print("[Coodara Startup] Non-production environment: continuing without worker.", file=sys.stderr)

    # Register cleanup hooks
    def _signal_handler(signum: int, frame: object) -> None:
        print(f"[Coodara Shutdown] Received signal {signum}. Shutting down services...")
        stop_celery_worker(worker_proc)
        sys.exit(0)

    try:
        signal.signal(signal.SIGTERM, _signal_handler)
        signal.signal(signal.SIGINT, _signal_handler)
    except (ValueError, AttributeError):
        pass

    atexit.register(stop_celery_worker, worker_proc)

    # Step 3: Uvicorn web server in foreground
    import uvicorn

    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0" if is_render else "127.0.0.1")

    print(f"[Coodara Startup] Step 3/3: Starting Uvicorn web server on {host}:{port}...")
    try:
        uvicorn.run("main:app", host=host, port=port, reload=False)
    finally:
        stop_celery_worker(worker_proc)
