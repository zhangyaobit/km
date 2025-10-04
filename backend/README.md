# Backend Service

This is a FastAPI backend service that responds to messages with predefined responses:
- "hello" → returns "hi"
- "bye" → returns "see you"
- anything else → returns "good"

## Prerequisites

- Docker installed on your system
- Port 8000 available on your machine

## Docker Setup

### Build the Docker image:
```bash
# Navigate to the backend directory
cd mira/backend

# Build the image
docker build -t mira-backend .
```

### Run the container:
```bash
# Run the container and map port 8000
docker run -p 8000:8000 mira-backend
```

## API Endpoint

The service exposes one endpoint:

- **POST** `/api/message`
  - Request body: `{ "text": "your message" }`
  - Response: `{ "response": "bot response" }`

## Development Without Docker

If you want to run the service without Docker:

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run the service:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

## Testing the API

You can test the API using curl:
```bash
curl -X POST http://localhost:8000/api/message \
  -H "Content-Type: application/json" \
  -d '{"text":"hello"}'
``` 