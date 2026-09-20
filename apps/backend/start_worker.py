import os
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.workers.celery_app import celery_app

if __name__ == "__main__":
    if len(sys.argv) > 1:
        args = ["worker"] + sys.argv[1:]
    else:
        # Default concurrency: solo for Windows, 1 worker for Linux/Render Free
        pool_args = ["-P", "solo"] if sys.platform == "win32" else ["-c", "1"]
        args = ["worker", "-l", "info"] + pool_args

    print(f"[Coodara Worker] Starting standalone Celery worker ({' '.join(args)})...")
    celery_app.worker_main(args)
