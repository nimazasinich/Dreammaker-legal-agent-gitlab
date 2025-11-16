#!/bin/bash
# Print runtime configuration for production smoke testing
# Shows key environment variables and config values relevant to production

set -e

echo "=========================================="
echo "Runtime Configuration Summary"
echo "=========================================="
echo ""

# Check if dotenv-cli is available (used by npm scripts)
if command -v dotenv-cli &> /dev/null; then
    ENV_CMD="dotenv-cli"
else
    ENV_CMD=""
fi

# Try to load from env.real if it exists
if [ -f "env.real" ]; then
    echo "📄 Loading from env.real"
    source env.real 2>/dev/null || true
elif [ -f ".env" ]; then
    echo "📄 Loading from .env"
    source .env 2>/dev/null || true
fi

echo ""
echo "=== Application Mode ==="
echo "APP_MODE: ${VITE_APP_MODE:-not set}"
echo "STRICT_REAL_DATA: ${VITE_STRICT_REAL_DATA:-not set}"
echo "USE_MOCK_DATA: ${VITE_USE_MOCK_DATA:-not set}"
echo "ALLOW_FAKE_DATA: ${VITE_ALLOW_FAKE_DATA:-not set}"
echo ""

echo "=== Trading Configuration ==="
echo "TRADING_MODE: ${VITE_TRADING_MODE:-not set}"
echo "KUCOIN_TESTNET: ${VITE_KUCOIN_TESTNET:-not set}"
echo "KUCOIN_API_KEY: $([ -n "$VITE_KUCOIN_API_KEY" ] && echo "***set***" || echo "not set")"
echo "KUCOIN_API_SECRET: $([ -n "$VITE_KUCOIN_API_SECRET" ] && echo "***set***" || echo "not set")"
echo "KUCOIN_API_PASSPHRASE: $([ -n "$VITE_KUCOIN_API_PASSPHRASE" ] && echo "***set***" || echo "not set")"
echo ""

echo "=== Data Sources ==="
echo "HF_ENGINE_URL: ${VITE_HF_ENGINE_URL:-not set}"
echo "HF_ENGINE_API_KEY: $([ -n "$VITE_HF_ENGINE_API_KEY" ] && echo "***set***" || echo "not set")"
echo "PRIMARY_DATA_SOURCE: ${PRIMARY_DATA_SOURCE:-not set}"
echo ""

echo "=== Backend Configuration ==="
echo "PORT: ${PORT:-8001 (default)}"
echo "API_BASE: ${VITE_API_BASE:-not set}"
echo "WS_BASE: ${VITE_WS_BASE:-not set}"
echo ""

echo "=== Logging ==="
echo "LOG_LEVEL: ${VITE_LOG_LEVEL:-not set (default: info)}"
echo ""

echo "=== Feature Flags ==="
# Try to read from config if available
if [ -f "config/system.config.json" ]; then
    echo "System config exists: yes"
    if command -v jq &> /dev/null; then
        echo "Features:"
        jq -r '.features | to_entries[] | "  \(.key): \(.value)"' config/system.config.json 2>/dev/null || echo "  (jq not available to parse)"
    fi
else
    echo "System config: not found"
fi
echo ""

echo "=== Validation ==="
VALIDATION_PASSED=true

if [ "${VITE_APP_MODE}" != "online" ]; then
    echo "⚠️  WARNING: APP_MODE is not 'online'"
    VALIDATION_PASSED=false
fi

if [ "${VITE_STRICT_REAL_DATA}" != "true" ]; then
    echo "⚠️  WARNING: STRICT_REAL_DATA is not 'true'"
    VALIDATION_PASSED=false
fi

if [ "${VITE_USE_MOCK_DATA}" = "true" ]; then
    echo "⚠️  WARNING: USE_MOCK_DATA is 'true' (should be false for production)"
    VALIDATION_PASSED=false
fi

if [ "${VITE_ALLOW_FAKE_DATA}" = "true" ]; then
    echo "⚠️  WARNING: ALLOW_FAKE_DATA is 'true' (should be false for production)"
    VALIDATION_PASSED=false
fi

if [ -z "$VITE_HF_ENGINE_URL" ]; then
    echo "⚠️  WARNING: HF_ENGINE_URL is not set"
    VALIDATION_PASSED=false
fi

if [ -z "$VITE_KUCOIN_API_KEY" ]; then
    echo "ℹ️  INFO: KuCoin API key not set (trading will be unavailable)"
fi

if [ "$VALIDATION_PASSED" = true ]; then
    echo "✅ Configuration validation passed"
else
    echo "❌ Configuration validation failed (see warnings above)"
fi

echo ""
echo "=========================================="
echo "End of Configuration Summary"
echo "=========================================="
