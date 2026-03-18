# Stage 1: Build frontend
FROM node:20-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Python server
FROM python:3.12-slim
WORKDIR /app

# Install system deps for PDF parsing
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc && rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY pyproject.toml ./
COPY src/ ./src/
RUN pip install --no-cache-dir .

# Copy wisdom data (seed data for new sessions)
COPY wisdom_data.json ./

# Copy built frontend
COPY --from=frontend-build /app/static ./static/

EXPOSE 8000

# Create data directory
RUN mkdir -p /tmp/advisory-board-data

CMD ["uvicorn", "server.app:app", "--host", "0.0.0.0", "--port", "8000"]
