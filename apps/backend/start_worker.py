import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.workers.celery_app import celery_app

if __name__ == "__main__":
    celery_app.worker_main(["worker", "-l", "info", "-P", "solo"])
