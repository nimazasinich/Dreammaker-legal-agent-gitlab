# Docker Deployment Guide

This guide covers building and deploying the DreammakerCryptoSignalAndTrader application using Docker containers.

## Overview

The application provides separate Dockerfiles for backend and frontend, optimized for production deployment:

- **Dockerfile.backend**: Node.js/Express API server with TypeScript compilation
- **Dockerfile.frontend**: React/Vite static build served by NGINX
- **docker-compose.prod.yml**: Production-ready orchestration with health checks and networking

## Prerequisites

- Docker Engine 20.10+ or Docker Desktop
- Docker Compose v2.0+
- At least 2GB free disk space for images
- Valid API keys (HF_TOKEN, exchange credentials)

---

## Quick Start (Local Production Testing)

Test the production Docker setup locally before deploying:

```bash
# 1. Build and start all services
docker compose -f docker-compose.prod.yml up --build

# 2. Access the application
# Frontend: http://localhost:80
# Backend API: http://localhost:8001/api/health

# 3. Stop services
docker compose -f docker-compose.prod.yml down
```

---

## Building Individual Containers

### Backend Container

Build the backend API server:

```bash
# Build the image
docker build -f Dockerfile.backend -t dreammaker-backend:latest .

# Run the container
docker run -d \
  --name dreammaker-backend \
  -p 8001:8001 \
  -e NODE_ENV=production \
  -e HF_TOKEN=your_token_here \
  -e KUCOIN_FUTURES_KEY=your_key_here \
  -e KUCOIN_FUTURES_SECRET=your_secret_here \
  -e KUCOIN_FUTURES_PASSPHRASE=your_passphrase_here \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/config:/app/config \
  dreammaker-backend:latest

# Check logs
docker logs -f dreammaker-backend

# Health check
curl http://localhost:8001/api/health
```

### Frontend Container

Build the frontend static site:

```bash
# Build the image
docker build -f Dockerfile.frontend -t dreammaker-frontend:latest .

# Run the container
docker run -d \
  --name dreammaker-frontend \
  -p 80:80 \
  dreammaker-frontend:latest

# Check logs
docker logs -f dreammaker-frontend

# Health check
curl http://localhost/health
```

---

## Docker Compose Production Setup

### Configuration

The `docker-compose.prod.yml` file orchestrates both services with proper networking and dependencies.

#### Environment Variables

Create a `.env.production.docker` file for Docker Compose (DO NOT commit secrets):

```bash
# Node environment
NODE_ENV=production
PORT=8001
FRONTEND_PORT=80

# API Keys (inject securely)
HF_TOKEN=your_hf_token
HUGGINGFACE_API_KEY=your_hf_token

# Exchange credentials (use testnet for staging)
KUCOIN_FUTURES_KEY=your_key
KUCOIN_FUTURES_SECRET=your_secret
KUCOIN_FUTURES_PASSPHRASE=your_passphrase
FUTURES_BASE_URL=https://api-futures.kucoin.com

# Data source
HF_ENGINE_BASE_URL=https://really-amin-datasourceforcryptocurrency.hf.space

# Redis (optional)
DISABLE_REDIS=false
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# Observability
LOG_LEVEL=info
```

### Starting Services

```bash
# Start all services with environment file
docker compose -f docker-compose.prod.yml --env-file .env.production.docker up -d

# Start with Redis enabled
docker compose -f docker-compose.prod.yml --profile with-redis up -d

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Check service status
docker compose -f docker-compose.prod.yml ps
```

### Stopping Services

```bash
# Stop services (keep data)
docker compose -f docker-compose.prod.yml stop

# Stop and remove containers
docker compose -f docker-compose.prod.yml down

# Stop and remove everything including volumes
docker compose -f docker-compose.prod.yml down -v
```

---

## Production Deployment

### 1. Build Images for Production

```bash
# Build optimized images
docker compose -f docker-compose.prod.yml build --no-cache

# Tag images for registry
docker tag dreammaker-backend:latest your-registry.com/dreammaker-backend:1.0.0
docker tag dreammaker-frontend:latest your-registry.com/dreammaker-frontend:1.0.0

# Push to registry
docker push your-registry.com/dreammaker-backend:1.0.0
docker push your-registry.com/dreammaker-frontend:1.0.0
```

### 2. Deploy to Production Server

On your production server:

```bash
# Pull latest images
docker pull your-registry.com/dreammaker-backend:1.0.0
docker pull your-registry.com/dreammaker-frontend:1.0.0

# Start services with production config
docker compose -f docker-compose.prod.yml up -d

# Verify deployment
curl https://your-domain.com/health
curl https://api.your-domain.com/api/health
```

### 3. Set Up Reverse Proxy (Recommended)

For production, use a reverse proxy (NGINX, Traefik, or Caddy) in front of your containers:

```nginx
# Example NGINX config
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Frontend
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## Container Management

### Viewing Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend

# Last 100 lines
docker compose -f docker-compose.prod.yml logs --tail=100 backend
```

### Executing Commands in Containers

```bash
# Access backend shell
docker compose -f docker-compose.prod.yml exec backend sh

# Run a health check
docker compose -f docker-compose.prod.yml exec backend node -e "require('http').get('http://localhost:8001/api/health', console.log)"

# Check frontend config
docker compose -f docker-compose.prod.yml exec frontend cat /etc/nginx/conf.d/default.conf
```

### Restarting Services

```bash
# Restart all services
docker compose -f docker-compose.prod.yml restart

# Restart specific service
docker compose -f docker-compose.prod.yml restart backend

# Rebuild and restart (after code changes)
docker compose -f docker-compose.prod.yml up -d --build backend
```

---

## Health Checks

Both containers have built-in health checks:

### Backend Health Check

```bash
# Via Docker
docker inspect --format='{{json .State.Health}}' dreammaker-backend | jq

# Via HTTP
curl http://localhost:8001/api/health
```

### Frontend Health Check

```bash
# Via Docker
docker inspect --format='{{json .State.Health}}' dreammaker-frontend | jq

# Via HTTP
curl http://localhost/health
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs for errors
docker logs dreammaker-backend

# Inspect container configuration
docker inspect dreammaker-backend

# Check if ports are available
netstat -tuln | grep -E '8001|80'
```

### Backend Can't Connect to External Services

```bash
# Test DNS resolution
docker exec dreammaker-backend nslookup really-amin-datasourceforcryptocurrency.hf.space

# Test network connectivity
docker exec dreammaker-backend wget -O- https://api-futures.kucoin.com

# Check environment variables
docker exec dreammaker-backend env | grep -E 'HF_|KUCOIN_'
```

### Frontend Can't Connect to Backend

```bash
# Check if backend is healthy
curl http://localhost:8001/api/health

# Check NGINX logs
docker logs dreammaker-frontend

# Verify backend URL in frontend build
docker exec dreammaker-frontend cat /usr/share/nginx/html/index.html | grep -i api
```

### Data Persistence Issues

```bash
# Check volume mounts
docker inspect dreammaker-backend | jq '.[0].Mounts'

# Verify data directory permissions
ls -la ./data ./config

# Backup data
docker run --rm -v $(pwd)/data:/data -v $(pwd)/backup:/backup alpine tar czf /backup/data-backup.tar.gz -C /data .
```

---

## Performance Tuning

### Resource Limits

Add resource constraints in `docker-compose.prod.yml`:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

### NGINX Caching

The frontend container includes optimized NGINX caching for static assets. To customize:

```bash
# Create custom NGINX config
cat > custom-nginx.conf << 'EOF'
# Your custom config here
EOF

# Mount it into the container
docker run -v $(pwd)/custom-nginx.conf:/etc/nginx/conf.d/default.conf dreammaker-frontend
```

---

## Security Best Practices

1. **Never commit secrets**: Use environment variables or Docker secrets
2. **Use non-root users**: Both Dockerfiles use non-root users by default
3. **Keep images updated**: Regularly rebuild with latest base images
   ```bash
   docker pull node:20-alpine
   docker pull nginx:alpine
   docker compose -f docker-compose.prod.yml build --no-cache
   ```
4. **Scan for vulnerabilities**:
   ```bash
   docker scan dreammaker-backend:latest
   docker scan dreammaker-frontend:latest
   ```
5. **Use secrets management**: For production, use Docker secrets or external secrets managers
   ```bash
   echo "my_secret" | docker secret create hf_token -
   ```

---

## Monitoring and Observability

### Prometheus Metrics

The backend exposes metrics at `/api/metrics` (if `ENABLE_METRICS=true`):

```bash
curl http://localhost:8001/api/metrics
```

### Health Check Endpoints

- Backend: `http://localhost:8001/api/health`
- Frontend: `http://localhost/health`

### Log Aggregation

For production, consider shipping logs to a central logging system:

```yaml
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

---

## Updating Containers

### Rolling Update Strategy

```bash
# 1. Pull new images
docker pull your-registry.com/dreammaker-backend:1.1.0

# 2. Update backend (zero downtime if using load balancer)
docker compose -f docker-compose.prod.yml up -d --no-deps backend

# 3. Verify new version is healthy
curl http://localhost:8001/api/health

# 4. Update frontend
docker compose -f docker-compose.prod.yml up -d --no-deps frontend
```

---

## Related Documentation

- [Runtime Profiles](./runtime-profiles.md) - Environment configuration
- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md) - Pre-deployment verification
- [Production Smoke Test Plan](./PRODUCTION_SMOKE_TEST_PLAN.md) - Testing procedures
- [CI/CD Guide](./ci-cd.md) - Automated build and test pipeline
