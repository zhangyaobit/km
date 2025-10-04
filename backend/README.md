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
cd km/backend
```

```bash
docker build -t km-backend .
```

### Run the container:
```bash
docker run -d --name yao -p 8000:8000 -v ~/s/km:/km -w /km/backend km-backend sleep infinity
```

### Run the service:
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