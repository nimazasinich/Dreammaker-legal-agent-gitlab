#!/usr/bin/env bash
#
# Print Runtime Configuration
#
# Displays key environment variables and configuration values relevant to production.
# Does NOT print secrets (API keys, credentials).
#
# Usage:
#   ./scripts/print-runtime-config.sh
#   # Or with environment file:
#   dotenv -e ./env.real -- ./scripts/print-runtime-config.sh

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "========================================"
echo "   DreammakerCrypto Runtime Config"
echo "========================================"
echo ""

# Helper function to print config value
print_config() {
    local label="$1"
    local var_name="$2"
    local default="${3:-<not set>}"
    local value="${!var_name:-$default}"
    
    # Mask secrets (anything with KEY, SECRET, PASSPHRASE, TOKEN)
    if [[ "$var_name" == *"KEY"* ]] || [[ "$var_name" == *"SECRET"* ]] || \
       [[ "$var_name" == *"PASSPHRASE"* ]] || [[ "$var_name" == *"TOKEN"* ]]; then
        if [[ "$value" != "<not set>" ]] && [[ -n "$value" ]]; then
            value="<set, ${#value} chars>"
        fi
    fi
    
    printf "%-35s: %s\n" "$label" "$value"
}

# Application Mode
echo -e "${BLUE}=== Application Mode ===${NC}"
print_config "App Mode" "VITE_APP_MODE" "demo"
print_config "Trading Mode" "VITE_TRADING_MODE" "DRY_RUN"
print_config "Node Environment" "NODE_ENV" "development"
echo ""

# Data Policy
echo -e "${BLUE}=== Data Policy ===${NC}"
print_config "Strict Real Data" "VITE_STRICT_REAL_DATA" "false"
print_config "Use Mock Data" "VITE_USE_MOCK_DATA" "false"
print_config "Allow Fake Data" "VITE_ALLOW_FAKE_DATA" "false"
echo ""

# Data Sources
echo -e "${BLUE}=== Data Sources ===${NC}"
print_config "HF Engine URL" "VITE_HF_ENGINE_URL" "<not set>"
print_config "HF Engine API Key" "VITE_HF_ENGINE_API_KEY" "<not set>"
print_config "Binance API Key" "VITE_BINANCE_API_KEY" "<not set>"
print_config "CoinMarketCap API Key" "VITE_COINMARKETCAP_API_KEY" "<not set>"
print_config "CryptoCompare API Key" "VITE_CRYPTOCOMPARE_API_KEY" "<not set>"
echo ""

# Exchange Configuration
echo -e "${BLUE}=== Exchange Configuration ===${NC}"
print_config "KuCoin API Key" "VITE_KUCOIN_API_KEY" "<not set>"
print_config "KuCoin API Secret" "VITE_KUCOIN_API_SECRET" "<not set>"
print_config "KuCoin Passphrase" "VITE_KUCOIN_API_PASSPHRASE" "<not set>"
print_config "KuCoin Testnet" "VITE_KUCOIN_TESTNET" "true"
echo ""

# Features
echo -e "${BLUE}=== Feature Flags ===${NC}"
print_config "Enable Futures" "FEATURE_FUTURES" "true"
print_config "Enable Spot" "FEATURE_SPOT" "false"
print_config "Enable AI Training" "FEATURE_AI_TRAINING" "true"
print_config "Enable Analytics" "VITE_ENABLE_ANALYTICS" "false"
echo ""

# System Configuration
echo -e "${BLUE}=== System Configuration ===${NC}"
print_config "API Base URL" "VITE_API_BASE" "http://localhost:8001/api"
print_config "WebSocket URL" "VITE_WS_URL" "<derived from API_BASE>"
print_config "Log Level" "VITE_LOG_LEVEL" "info"
print_config "Auto Refresh Interval" "VITE_AUTO_REFRESH_INTERVAL" "0 (disabled)"
print_config "Port" "PORT" "8001"
echo ""

# Network Configuration
echo -e "${BLUE}=== Network Configuration ===${NC}"
print_config "HTTP Proxy" "HTTP_PROXY" "<not set>"
print_config "HTTPS Proxy" "HTTPS_PROXY" "<not set>"
print_config "No Proxy" "NO_PROXY" "<not set>"
print_config "Use Global Proxy (Binance)" "USE_GLOBAL_PROXY_FOR_BINANCE" "false"
echo ""

# Validation Summary
echo -e "${BLUE}=== Configuration Validation ===${NC}"
echo ""

# Check critical variables for production
WARNINGS=0
ERRORS=0

# Check APP_MODE
if [[ "${VITE_APP_MODE:-demo}" == "online" ]]; then
    echo -e "${GREEN}✓${NC} App Mode is 'online' (production ready)"
elif [[ "${VITE_APP_MODE:-demo}" == "demo" ]]; then
    echo -e "${YELLOW}⚠${NC} App Mode is 'demo' (limited functionality)"
    ((WARNINGS++))
else
    echo -e "${RED}✗${NC} App Mode is '${VITE_APP_MODE}' (unexpected value)"
    ((ERRORS++))
fi

# Check STRICT_REAL_DATA
if [[ "${VITE_STRICT_REAL_DATA:-false}" == "true" ]]; then
    echo -e "${GREEN}✓${NC} Strict Real Data is enabled (production safe)"
else
    echo -e "${YELLOW}⚠${NC} Strict Real Data is disabled (allows mock data)"
    ((WARNINGS++))
fi

# Check ALLOW_FAKE_DATA
if [[ "${VITE_ALLOW_FAKE_DATA:-false}" == "false" ]]; then
    echo -e "${GREEN}✓${NC} Fake Data is disabled (production safe)"
else
    echo -e "${RED}✗${NC} Fake Data is ENABLED (DANGEROUS in production)"
    ((ERRORS++))
fi

# Check TRADING_MODE
if [[ "${VITE_TRADING_MODE:-DRY_RUN}" == "TESTNET" ]]; then
    echo -e "${GREEN}✓${NC} Trading Mode is 'TESTNET' (safe for testing)"
elif [[ "${VITE_TRADING_MODE:-DRY_RUN}" == "DRY_RUN" ]]; then
    echo -e "${YELLOW}⚠${NC} Trading Mode is 'DRY_RUN' (simulated only)"
    ((WARNINGS++))
elif [[ "${VITE_TRADING_MODE:-DRY_RUN}" == "LIVE" ]]; then
    echo -e "${RED}⚠⚠⚠${NC} Trading Mode is 'LIVE' (REAL MONEY AT RISK)"
    ((WARNINGS++))
else
    echo -e "${GREEN}✓${NC} Trading Mode is 'OFF' (no trading)"
fi

# Check HF Engine URL
if [[ -n "${VITE_HF_ENGINE_URL:-}" ]]; then
    echo -e "${GREEN}✓${NC} HF Engine URL is configured"
else
    echo -e "${RED}✗${NC} HF Engine URL is NOT configured (required for online mode)"
    ((ERRORS++))
fi

# Check KuCoin credentials (if trading is enabled)
if [[ "${VITE_TRADING_MODE:-DRY_RUN}" == "TESTNET" ]] || [[ "${VITE_TRADING_MODE:-DRY_RUN}" == "LIVE" ]]; then
    if [[ -n "${VITE_KUCOIN_API_KEY:-}" ]] && \
       [[ -n "${VITE_KUCOIN_API_SECRET:-}" ]] && \
       [[ -n "${VITE_KUCOIN_API_PASSPHRASE:-}" ]]; then
        echo -e "${GREEN}✓${NC} KuCoin credentials are configured"
        
        # Check testnet mode
        if [[ "${VITE_KUCOIN_TESTNET:-true}" == "true" ]]; then
            echo -e "${GREEN}✓${NC} KuCoin Testnet mode is enabled (safe)"
        else
            echo -e "${RED}⚠⚠⚠${NC} KuCoin MAINNET mode is enabled (REAL MONEY AT RISK)"
            ((WARNINGS++))
        fi
    else
        echo -e "${YELLOW}⚠${NC} KuCoin credentials are incomplete (trading may fail)"
        ((WARNINGS++))
    fi
else
    echo -e "${GREEN}✓${NC} Trading disabled, KuCoin credentials not required"
fi

echo ""
echo "========================================"
if [[ $ERRORS -gt 0 ]]; then
    echo -e "${RED}Configuration Status: ERRORS FOUND (${ERRORS})${NC}"
    echo -e "${RED}Fix errors before deploying to production!${NC}"
elif [[ $WARNINGS -gt 0 ]]; then
    echo -e "${YELLOW}Configuration Status: WARNINGS (${WARNINGS})${NC}"
    echo -e "${YELLOW}Review warnings before deploying.${NC}"
else
    echo -e "${GREEN}Configuration Status: ALL CHECKS PASSED${NC}"
fi
echo "========================================"
echo ""

exit 0
