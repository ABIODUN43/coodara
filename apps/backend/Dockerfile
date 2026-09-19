FROM python:3.13-slim

WORKDIR /app

# Install git and system tools required for repository analysis
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY apps/backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY pyproject.toml alembic.ini ./
COPY migrations/ migrations/
COPY apps/backend/ apps/backend/

ENV PYTHONPATH="/app/apps/backend"

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
