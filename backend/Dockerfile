FROM python:3.12-slim

WORKDIR /app

# WeasyPrint needs these system libraries for PDF generation
RUN apt-get update && apt-get install -y \
    libpango-1.0-0 libpangoft2-1.0-0 libpangocairo-1.0-0 \
    libcairo2 libgdk-pixbuf-xlib-2.0-0 libffi-dev shared-mime-info \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /app/pdfs

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"]
