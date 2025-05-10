FROM python:3.9-slim

WORKDIR /app
COPY *.py requirements.txt /app/
COPY abi/ /app/abi/

# Create storage directory
RUN mkdir -p /app/storage && pip install -r requirements.txt

ENTRYPOINT ["python", "main.py"] 