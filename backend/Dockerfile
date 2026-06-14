FROM python:3.12-slim

WORKDIR /app

# System libraries required at runtime and build time:
#   libpq-dev + gcc  → lets psycopg2-binary compile from source on platforms
#                       that have no pre-built wheel (e.g. ARM Linux).
#                       Without these the Docker build crashes with
#                       "pg_config executable not found".
#   libffi-dev       → required by python-jose (cryptography backend)
#   shared-mime-info → required by xhtml2pdf for MIME type detection
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    libffi-dev \
    shared-mime-info \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /app/pdfs

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"]
