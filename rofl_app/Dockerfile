FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Set environment variables
ENV PYTHONUNBUFFERED=1

# Environment variables
ENV WEB3_PROVIDER=https://testnet.sapphire.oasis.io
ENV ROFLSWAP_ADDRESS=0x8d71Ad1fB193DdA7ABC9DD21a05Ef3E913CAE4Df
ENV WATER_TOKEN=0x96c5F50000dE0B12CBa648eAfAab818aBCadAaA4
ENV FIRE_TOKEN=0xf2b3B8BE27A7712e06eEA16175cC8BacC6980f5C
ENV ROFL_APP_ID=rofl1qqxpkwggyjaw6du7c2vzgdggwhjvjqp9tvqzkag3

# Default command
CMD ["python", "main.py", "getTotalOrderCount", "--address", "$ROFLSWAP_ADDRESS"] 