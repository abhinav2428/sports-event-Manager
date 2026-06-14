FROM python:3.12-slim

WORKDIR /app

# System libraries required at runtime and build time:
#   libpq-dev + gcc      → lets psycopg2-binary compile from source on platforms
#                          that have no pre-built wheel (e.g. ARM Linux).
#                          Without these the Docker build crashes with
#                          "pg_config executable not found".
#   libcairo2-dev        → Cairo graphics library headers.
#                          xhtml2pdf → pycairo (transitive) needs these to
#                          build from source. Without them the Docker build
#                          crashes with "Dependency lookup for cairo failed:
#                          Pkg-config for host machine not found".
#   pkg-config + cmake   → build-system tools required by pycairo's meson build.
#   libffi-dev           → required by python-jose (cryptography backend)
#   shared-mime-info     → required by xhtml2pdf for MIME type detection
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    libcairo2-dev \
    pkg-config \
    cmake \
    libffi-dev \
    shared-mime-info \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /app/pdfs

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"]
