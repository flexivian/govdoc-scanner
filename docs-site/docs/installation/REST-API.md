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

### Required Services

Before deploying the API, ensure you have:

1. **OpenSearch cluster running** (required for data access)
2. **Docker and Docker Compose** installed
3. **Company data indexed** in OpenSearch

### Setup OpenSearch First

```bash
# Navigate to OpenSearch production setup
cd opensearch/production

# Run the unified production setup script
./setup-production.sh
```

Check [OpenSearch Setup](./OpenSearch.md) for advanced configuration.

This will:

- Generate secure passwords and certificates
- Start the production OpenSearch cluster
- Initialize security configuration (create users and roles)
- Initialize indices, templates, and aliases
- Setup OpenSearch Dashboards

## Development Deployment

Development deployment is ideal for:

- Local development and testing
- Integration with existing OpenSearch cluster
- Debugging and development workflows
- Testing API functionality

### Quick Development Setup

```bash
cd api

# 1. Setup environment file
./docker-deploy.sh setup

# 2. Configure environment variables
nano .env
```

### Environment Configuration

Edit the `.env` file with your development settings:

```bash
# API Configuration
API_PORT=8080
API_HOST=0.0.0.0
API_MAX_BODY_BYTES=1000000

# Authentication Configuration
# Generate a strong API key for production
API_KEY=your-secure-api-key-here
API_KEY_ROLE=admin

# OpenSearch Configuration for Development
# Use container hostname for Docker deployment
OPENSEARCH_URL=https://govdoc-opensearch-production:9200
OPENSEARCH_USERNAME=govdoc_ingest
OPENSEARCH_PASSWORD=your-govdoc-ingest-password-here
OPENSEARCH_INDEX=govdoc-companies-write
OPENSEARCH_BATCH_SIZE=500
OPENSEARCH_INSECURE=true
API_OS_REQUEST_TIMEOUT_MS=5000

# Logging Configuration
LOG_LEVEL=info
```

### Deploy Development Environment

```bash
# Build and start development services
./docker-deploy.sh build dev
./docker-deploy.sh start dev
```

### Development Features

| Feature                    | Development Configuration                               |
| -------------------------- | ------------------------------------------------------- |
| **Network Access**         | Public (`0.0.0.0:8080`) - accessible from any interface |
| **OpenSearch Integration** | Connected to production OpenSearch network              |
| **Logging Level**          | `info` - verbose logging for debugging                  |
| **Memory Allocation**      | 512M limit, 256M reserved                               |
| **CPU Allocation**         | 0.5 limit, 0.25 reserved                                |
| **Security**               | Basic security settings                                 |
| **Container Name**         | `govdoc-scanner-api`                                    |
| **Restart Policy**         | `unless-stopped`                                        |

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

## Production Deployment

Production deployment provides:

- Enhanced security configurations
- Optimized resource allocation
- Production-grade logging
- Localhost-only access (requires reverse proxy)
- Better performance tuning

### Quick Production Setup

```bash
cd api

# 1. Setup environment file (if not already done)
./docker-deploy.sh setup

# 2. Configure production environment
nano .env

# 3. Deploy production services
./docker-deploy.sh deploy
```

### Production Environment Configuration

For production, use the same `.env` configuration as development, but consider:

```bash
# Use stronger API keys in production
API_KEY=generate-a-very-strong-api-key-here

# Consider using a specific OpenSearch user with limited permissions
OPENSEARCH_USERNAME=govdoc_ingest  # Not admin user for security

# Set appropriate logging level for production
LOG_LEVEL=warn
```

### Deploy Production Environment

```bash
# Option 1: Full deployment (recommended)
./docker-deploy.sh deploy

# Option 2: Step-by-step deployment
./docker-deploy.sh build prod
./docker-deploy.sh start prod
```

### Production Features

| Feature                    | Production Configuration                                   |
| -------------------------- | ---------------------------------------------------------- |
| **Network Access**         | Localhost only (`127.0.0.1:8080`) - requires reverse proxy |
| **OpenSearch Integration** | Connected to production OpenSearch + internal network      |
| **Logging Level**          | `warn` - reduced verbosity with log rotation               |
| **Memory Allocation**      | 1G limit, 512M reserved                                    |
| **CPU Allocation**         | 1.0 limit, 0.5 reserved                                    |
| **Security**               | Enhanced (capabilities dropped, read-only filesystem)      |
| **Container Name**         | `govdoc-scanner-api-prod`                                  |
| **Restart Policy**         | `always`                                                   |
| **Temp Storage**           | 200M (vs 100M in development)                              |

### Enhanced Production Security

Production deployment includes:

- **Dropped Linux Capabilities**: All capabilities dropped except `NET_BIND_SERVICE`
- **Read-only Filesystem**: Container filesystem is read-only with specific writable mounts
- **User Namespace**: Runs as non-root user (1001:1001)
- **Network Isolation**: Localhost-only binding prevents direct external access
- **Log Rotation**: JSON logs with size and rotation limits
- **Resource Limits**: Strict memory and CPU limits

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

## Accessing the API

### Development Access

- **Base URL**: `http://localhost:8080`
- **Access**: Available from any network interface
- **Health Check**: `http://localhost:8080/health`
- **API Documentation**: `http://localhost:8080/docs`
- **OpenAPI Spec**: `http://localhost:8080/openapi.json`

### Production Access

- **Base URL**: `http://localhost:8080` (localhost only)
- **External Access**: Requires reverse proxy (nginx, traefik, etc.)
- **Health Check**: `curl http://localhost:8080/health`
- **API Documentation**: `http://localhost:8080/docs`
- **OpenAPI Spec**: `http://localhost:8080/openapi.json`

## Authentication

The API supports dual authentication methods:

### API Key Authentication (Recommended)

```bash
# Include API key in request header
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

# Search companies (requires authentication)
curl -H "X-API-Key: your-api-key" \
  "http://localhost:8080/companies?q=AKTIS&size=5"

# Get specific company
curl -H "X-API-Key: your-api-key" \
  "http://localhost:8080/companies/123456789000"

# Search representatives
curl -H "X-API-Key: your-api-key" \
  "http://localhost:8080/companies/representatives?name=SMITH"
```

### Expected Response Format

All responses follow a consistent structure:

```json
{
  "data": {
    // Actual response data
  },
  "meta": {
    "request_id": "uuid",
    "total": 42, // For paginated results
    "from": 0, // Pagination offset
    "size": 10 // Page size
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

## Monitoring & Maintenance

### Container Health Monitoring

```bash
# Check container status
./docker-deploy.sh status [dev|prod]

# View container logs
./docker-deploy.sh logs [dev|prod]

# Follow logs in real-time
./docker-deploy.sh logs [dev|prod] -f
```

### Health Endpoints

- **`GET /health`**: Basic health check with OpenSearch status
- **`GET /internal/stats`**: API performance metrics (requires auth)
- **`GET /metrics`**: Prometheus metrics (requires auth)

### Log Management

#### Development Logs

- **Level**: Info (verbose)
- **Format**: JSON structured
- **Location**: Docker container logs

#### Production Logs

- **Level**: Warn (reduced verbosity)
- **Format**: JSON with rotation
- **Limits**: 10MB max size, 3 files retained
- **Labels**: Service, environment, version tags

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

## Advanced Configuration

### Environment Variables Reference

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
