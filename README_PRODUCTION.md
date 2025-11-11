# Production Runbook

## Images
- Server: `ghcr.io/nimazasinich/dcs-server:<tag|latest>`
- Client: `ghcr.io/nimazasinich/dcs-client:<tag|latest>`

## First-time on host
```bash
mkdir -p ~/apps/dcs/deploy
scp deploy/docker-compose.prod.yml user@host:~/apps/dcs/deploy/
```

## Deploy (manual, on host)
```bash
cd ~/apps/dcs/deploy
export HUGGINGFACE_API_KEY=hf_xxx
export REDIS_URL=redis://localhost:6379
export TELEGRAM_BOT_TOKEN=xxx
export TELEGRAM_CHAT_ID=12345
docker login ghcr.io -u <user> -p <token>
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
curl -s http://localhost:8000/status/health
```

## CI/CD
- **CD workflow** runs on tag `v*` or manual dispatch.
- Publishes images to GHCR, then SSHes to host and `compose up -d`.

### Telegram Notifications
The CD workflow sends real-time Telegram notifications for:

- 🚀 **Build started** - When Docker images begin building
- ✅ **Build success** - After images are pushed to GHCR
- ❌ **Build failure** - If image builds or pushes fail
- 🚢 **Deployment started** - When SSH deployment begins
- 🎉 **Deployment success** - After health checks pass
- 🚨 **Deployment failure** - If deployment or health checks fail

**Setup:**
1. Create a Telegram bot via [@BotFather](https://t.me/botfather)
2. Get your chat ID (message [@userinfobot](https://t.me/userinfobot))
3. Add `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` to GitHub Secrets

**Optional:** If these secrets are not set, the workflow runs without notifications.

## Rollback
```bash
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
# or pin a previous tag in docker-compose.prod.yml
```

## Required GitHub Secrets
Set these in **Settings → Secrets and variables → Actions**:

- `SSH_HOST` - Target deployment host
- `SSH_USER` - SSH username
- `SSH_KEY` - SSH private key
- `SSH_PORT` - SSH port (optional, defaults to 22)
- `HUGGINGFACE_API_KEY` - HuggingFace API key
- `REDIS_URL` - Redis connection URL (optional)
- `TELEGRAM_BOT_TOKEN` - Telegram bot token (optional)
- `TELEGRAM_CHAT_ID` - Telegram chat ID (optional)

## Local Testing
```bash
# Build images
docker build -t dcs-server:dev --target server-runner .
docker build -t dcs-client:dev --target client-static .

# Run stack
docker compose -f deploy/docker-compose.prod.yml up -d --build
curl -s http://localhost/status/health
curl -s "http://localhost/api/hf/ohlcv?symbol=BTCUSDT&timeframe=1h&limit=60" | head
```

## Monitoring
- Client: http://localhost (Nginx serves SPA)
- API: http://localhost/api/* (proxied to server:8000)
- Health: http://localhost/status/health
- WebSocket: ws://localhost/ws

## Troubleshooting
```bash
# View logs
docker compose -f deploy/docker-compose.prod.yml logs -f

# Restart services
docker compose -f deploy/docker-compose.prod.yml restart

# Check service status
docker compose -f deploy/docker-compose.prod.yml ps
```
