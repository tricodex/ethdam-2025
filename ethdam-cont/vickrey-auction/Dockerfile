FROM python:3.11-slim

WORKDIR /app

# Copy requirements first for better caching
COPY app/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application
COPY app/ .

# Make the script executable
RUN chmod +x auction_service.py

# Expose the port for the API
EXPOSE 8000

# Run the server
ENTRYPOINT ["python", "auction_service.py"]
