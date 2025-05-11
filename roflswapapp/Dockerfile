FROM python:3.12-slim

WORKDIR /app

# Install dependencies including curl for socket testing
RUN apt-get update && apt-get install -y \
    gcc \
    python3-dev \
    curl \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install them
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the test script first (for better layer caching)
COPY test_rofl.py .

# Copy application code
COPY *.py .
COPY abi/ ./abi/
COPY entrypoint.sh .

# Create storage directory for logs
RUN mkdir -p /app/storage/logs

# Make entrypoint script executable
RUN chmod +x /app/entrypoint.sh
RUN chmod +x /app/test_rofl.py

# Set environment variables
ENV PYTHONUNBUFFERED=1

# Run the application
ENTRYPOINT ["/app/entrypoint.sh"] 