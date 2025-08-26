# REST API Installation & Deployment

The GovDoc Scanner REST API provides a robust interface for querying Greek company metadata from GEMI registry scans. This guide covers both development and production deployment scenarios.

## Overview

The REST API is a containerized Node.js application built with Fastify that:

- Connects to OpenSearch for data querying
- Provides authentication via API keys or JWT tokens
- Offers comprehensive company search capabilities
- Includes built-in rate limiting and security features
- Supports both development and production deployment modes

## Prerequisites

- Docker and Docker Compose
- Company data indexed in OpenSearch
- **IMPORTANT**: You need to setup OpenSearch Production First for both Development and Production REST API environments. Check [OpenSearch Setup](./OpenSearch.md) for configuration.

### 1. Setup Environment

```bash
cd apps/api
./docker-deploy.sh setup
```

### 2. Configure Environment Variables

Edit the `.env` file with your development settings:

```bash
# Environment variables for GovDoc Scanner API

# API Configuration
API_PORT=8080
API_HOST=0.0.0.0
API_MAX_BODY_BYTES=1000000

# Authentication Configuration
# Generate a strong API key for production
API_KEY=your-secure-api-key-here
API_KEY_ROLE=admin

# OpenSearch Configuration for the API
OPENSEARCH_URL=https://govdoc-opensearch-production:9200 # DO NOT CHANGE THIS
OPENSEARCH_USERNAME=govdoc_ingest
OPENSEARCH_PASSWORD=your-govdoc-ingest-password-here
OPENSEARCH_INDEX=govdoc-companies-write
OPENSEARCH_BATCH_SIZE=500
OPENSEARCH_INSECURE=true
API_OS_REQUEST_TIMEOUT_MS=5000

# Logging Configuration For Docker
# Options: debug, info, warn, error
LOG_LEVEL=info
```

Now you can choose between a development or production environment, depending on your needs:

- **Development**: For local development, testing, and debugging.
- **Production**: For secure, optimized, and production-grade deployments.

Follow the relevant setup instructions below for your chosen environment.

## Development Setup

### Deploy Development Services

```bash
./docker-deploy.sh build dev
./docker-deploy.sh start dev
```

### Access Development API

- **Base URL**: `http://localhost:8080`
- **Health Check**: `http://localhost:8080/health`
- **API Documentation**: `http://localhost:8080/docs`
- **OpenAPI Spec**: `http://localhost:8080/openapi.json`

## Production Setup

Production deployment provides enhanced security, optimized resources, and production-grade logging.

### Quick Setup

```bash
cd apps/api
./docker-deploy.sh deploy
```

### Manual Setup

For step-by-step control:

```bash
cd apps/api
# Step 1: Setup environment (if not already done)
./docker-deploy.sh setup
# Step 2: Configure production environment
nano .env
# Step 3: Build production services
./docker-deploy.sh build prod
./docker-deploy.sh start prod
```

### Access Production API

- **Base URL**: `http://localhost:8080` (localhost only)
- **External Access**: Requires reverse proxy (nginx, traefik, etc.)
- **Health Check**: `curl http://localhost:8080/health`
- **API Documentation**: `http://localhost:8080/docs`
- **OpenAPI Spec**: `http://localhost:8080/openapi.json`

## Environment Differences

| Feature               | Development               | Production                                    |
| --------------------- | ------------------------- | --------------------------------------------- |
| **Network Access**    | Public (`0.0.0.0:8080`)   | Localhost only (`127.0.0.1:8080`)             |
| **Memory Allocation** | 512M limit, 256M reserved | 1G limit, 512M reserved                       |
| **CPU Allocation**    | 0.5 limit, 0.25 reserved  | 1.0 limit, 0.5 reserved                       |
| **Logging Level**     | `info` - verbose logging  | `warn` - reduced verbosity with rotation      |
| **Security**          | Basic security settings   | Enhanced (dropped caps, read-only filesystem) |
| **Container Name**    | `govdoc-scanner-api`      | `govdoc-scanner-api-prod`                     |
| **Restart Policy**    | `unless-stopped`          | `always`                                      |

## Authentication

The API supports dual authentication methods:

### API Key Authentication

```bash
curl -H "X-API-Key: your-secure-api-key" \
  "http://localhost:8080/companies?q=AKTIS"
```

### JWT Bearer Token Authentication

```bash
# 1. Login to obtain token
TOKEN=$(curl -X POST -H "Content-Type: application/json" \
  -d '{"username": "user", "password": "pass"}' \
  "http://localhost:8080/login" | jq -r '.data.token')

# 2. Use token for subsequent requests
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/companies?q=AKTIS"
```

## API Testing

### Quick Test Commands

```bash
# Health check
curl "http://localhost:8080/health"

# Get specific company
curl -H "X-API-Key: your-api-key" \
  "http://localhost:8080/companies/123456789000"

```

### Response Format

All responses follow a consistent structure:

```json
{
  "data": {
    // Actual response data
  },
  "meta": {
    "request_id": "uuid",
    "total": 42,
    "from": 0,
    "size": 10
  }
}
```

Error responses:

```json
{
  "error": {
    "code": "error_code",
    "message": "Human readable message",
    "request_id": "uuid",
    "details": {
      // Optional structured info
    }
  }
}
```

## Management Commands

### Development Commands

```bash
# Container Management
./docker-deploy.sh build dev      # Build development image
./docker-deploy.sh start dev      # Start development services
./docker-deploy.sh stop dev       # Stop development services
./docker-deploy.sh restart dev    # Restart development services

# Monitoring
./docker-deploy.sh status dev     # Show development container status
./docker-deploy.sh logs dev       # View development logs
./docker-deploy.sh logs dev -f    # Follow development logs in real-time
```

### Production Commands

```bash
# Container Management
./docker-deploy.sh build prod     # Build production image with date tag
./docker-deploy.sh start prod     # Start production services
./docker-deploy.sh stop prod      # Stop production services
./docker-deploy.sh restart prod   # Restart production services

# Monitoring
./docker-deploy.sh status prod    # Show production container status
./docker-deploy.sh logs prod      # View production logs
./docker-deploy.sh logs prod -f   # Follow production logs in real-time

# Full Deployment
./docker-deploy.sh deploy         # Complete production deployment (build + start)
```

## Monitoring & Maintenance

### Health Endpoints

- **`GET /health`**: Basic health check with OpenSearch status
- **`GET /internal/stats`**: API performance metrics (requires auth)
- **`GET /metrics`**: Prometheus metrics (requires auth)

## Troubleshooting

### Common Issues

**1. API Returns "Search unavailable"**

```bash
# Check OpenSearch connection
curl -H "X-API-Key: your-key" "http://localhost:8080/health"

# Verify OpenSearch is running
docker ps | grep opensearch
```

**2. Connection Refused**

```bash
# Check if API container is running
./docker-deploy.sh status

# Check container logs for errors
./docker-deploy.sh logs
```

**3. Authentication Errors**

```bash
# Verify API key is correct in .env file
grep API_KEY .env

# Test with correct header format
curl -H "X-API-Key: your-actual-key" "http://localhost:8080/health"
```

### Network Troubleshooting

**Development Network Issues:**

```bash
# Check network connectivity
docker network ls | grep api
docker network ls | grep opensearch

# Verify containers are on same networks
docker inspect govdoc-scanner-api | grep NetworkMode
```

**Production Network Issues:**

```bash
# Check production networks
docker network ls | grep prod

# Verify external access (production)
curl http://localhost:8080/health  # Should work
curl http://your-server-ip:8080/health  # Should fail (localhost only)
```

## Environment Variables Reference

| Variable                    | Default | Description                           |
| --------------------------- | ------- | ------------------------------------- |
| `API_PORT`                  | 8080    | API server port                       |
| `API_HOST`                  | 0.0.0.0 | API server host                       |
| `API_MAX_BODY_BYTES`        | 1000000 | Maximum request body size             |
| `API_KEY`                   | -       | Primary API key (required)            |
| `API_KEY_ROLE`              | admin   | Role for API key users                |
| `OPENSEARCH_URL`            | -       | OpenSearch endpoint                   |
| `OPENSEARCH_USERNAME`       | -       | OpenSearch username                   |
| `OPENSEARCH_PASSWORD`       | -       | OpenSearch password                   |
| `OPENSEARCH_INDEX`          | -       | OpenSearch index/alias                |
| `OPENSEARCH_BATCH_SIZE`     | 500     | Batch size for operations             |
| `OPENSEARCH_INSECURE`       | false   | Skip SSL verification                 |
| `API_OS_REQUEST_TIMEOUT_MS` | 5000    | OpenSearch request timeout            |
| `LOG_LEVEL`                 | info    | Logging level (debug/info/warn/error) |
