#!/bin/bash
# Simple OHLCV Data Verification Script
# Tests basic API endpoints for OHLCV data

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BASE_URL="${BASE_URL:-http://localhost:8000}"

echo -e "${BLUE}🔍 OHLCV Data Verification Tests${NC}"
echo "===================================="
echo ""

# Test function
test_endpoint() {
    local name=$1
    local endpoint=$2
    local expected_status=${3:-200}
    
    echo -n "Testing $name... "
    
    response=$(curl -s -w "\n%{http_code}" "${BASE_URL}${endpoint}" 2>/dev/null || echo "000")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "$expected_status" ]; then
        # Check if response has data
        if echo "$body" | grep -q "open\|high\|low\|close\|volume\|timestamp" || [ ${#body} -gt 10 ]; then
            echo -e "${GREEN}✓ PASSED${NC} (HTTP $http_code, has data)"
            return 0
        else
            echo -e "${YELLOW}⚠ WARNING${NC} (HTTP $http_code, but no data found)"
            return 1
        fi
    else
        echo -e "${RED}✗ FAILED${NC} (HTTP $http_code)"
        return 1
    fi
}

# Test 1: CoinGecko via proxy
echo "1. CoinGecko OHLCV Data"
echo "----------------------"
test_endpoint "CoinGecko OHLC (30 days)" "/api/proxy/coingecko/coins/bitcoin/ohlc?vs_currency=usd&days=30"
echo ""

# Test 2: Binance via proxy
echo "2. Binance OHLCV Data"
echo "----------------------"
test_endpoint "Binance Klines (365 days)" "/api/proxy/binance/klines?symbol=BTCUSDT&interval=1d&limit=365"
echo ""

# Test 3: Market Data Endpoints
echo "3. Market Data Endpoints"
echo "----------------------"
test_endpoint "Market OHLCV" "/api/market/ohlcv?symbol=BTC-USDT&interval=1d&limit=100"
test_endpoint "Market Historical" "/api/market/historical?symbol=BTC&interval=1d&limit=100"
echo ""

# Test 4: CryptoCompare
echo "4. CryptoCompare Data"
echo "----------------------"
test_endpoint "CryptoCompare Prices" "/api/market/cryptocompare-prices?symbols=BTC"
echo ""

# Test 5: Direct API tests (if server is not running)
echo "5. Direct API Tests (Fallback)"
echo "----------------------"
echo -n "Testing CoinGecko direct... "
if curl -s -f "https://api.coingecko.com/api/v3/coins/bitcoin/ohlc?vs_currency=usd&days=30" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASSED${NC}"
else
    echo -e "${RED}✗ FAILED${NC}"
fi

echo -n "Testing Binance direct... "
if curl -s -f "https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=365" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASSED${NC}"
else
    echo -e "${RED}✗ FAILED${NC}"
fi

echo -n "Testing CryptoCompare direct... "
if curl -s -f "https://min-api.cryptocompare.com/data/v2/histoday?fsym=BTC&tsym=USD&limit=200" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASSED${NC}"
else
    echo -e "${RED}✗ FAILED${NC}"
fi

echo ""
echo "===================================="
echo -e "${BLUE}Tests completed!${NC}"
echo ""
echo "For detailed verification, run:"
echo "  npm run test:ohlcv"
echo "or"
echo "  npx tsx scripts/test-ohlcv-data-verification.ts"
