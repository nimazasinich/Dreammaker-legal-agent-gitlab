#!/bin/bash
# Test Data Retrieval System
# This script tests all configured data sources and provides a comprehensive report

set -e

echo "🔍 Testing Data Retrieval System..."
echo "===================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-http://localhost:8000}"
TEST_SYMBOLS=("BTC" "ETH" "SOL" "XRP")

# Results tracking
PASSED=0
FAILED=0
WARNINGS=0

# Function to test an endpoint
test_endpoint() {
    local name=$1
    local endpoint=$2
    local expected_status=${3:-200}
    
    echo -n "Testing $name... "
    
    response=$(curl -s -w "\n%{http_code}" "${BASE_URL}${endpoint}" || echo "000")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASSED${NC} (HTTP $http_code)"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC} (HTTP $http_code)"
        ((FAILED++))
        return 1
    fi
}

# Function to test with timeout
test_endpoint_timeout() {
    local name=$1
    local endpoint=$2
    local timeout=${3:-10}
    
    echo -n "Testing $name (timeout: ${timeout}s)... "
    
    if timeout $timeout curl -s -f "${BASE_URL}${endpoint}" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC} (timeout or error)"
        ((FAILED++))
        return 1
    fi
}

# Test 1: Health Check
echo "1. System Health Checks"
echo "-----------------------"
test_endpoint "System Health" "/api/health"
test_endpoint "Provider Status" "/api/providers/status"
test_endpoint "System Status" "/api/system/status"
echo ""

# Test 2: Data Source Configuration
echo "2. Data Source Configuration"
echo "---------------------------"
test_endpoint "Data Source Config" "/api/config/data-source"
echo ""

# Test 3: Market Data Endpoints
echo "3. Market Data Endpoints"
echo "------------------------"
test_endpoint "Market Prices" "/api/market/prices"
test_endpoint "Real Prices" "/api/market/real-prices"
test_endpoint "CoinGecko Prices" "/api/market/coingecko-prices"
test_endpoint "CryptoCompare Prices" "/api/market/cryptocompare-prices"

# Test individual symbol prices
for symbol in "${TEST_SYMBOLS[@]}"; do
    test_endpoint "Price for $symbol" "/api/price/$symbol"
done
echo ""

# Test 4: Historical Data
echo "4. Historical Data Endpoints"
echo "---------------------------"
test_endpoint "Market Historical" "/api/market/historical?symbol=BTC&interval=1h&limit=100"
test_endpoint "OHLCV Data" "/api/market/ohlcv?symbol=BTC&interval=1h"
echo ""

# Test 5: Proxy Endpoints
echo "5. Proxy Endpoints"
echo "------------------"
test_endpoint "Binance Proxy - Price" "/api/proxy/binance/price?symbol=BTCUSDT"
test_endpoint "CoinGecko Proxy - Simple Price" "/api/proxy/coingecko/simple/price?ids=bitcoin&vs_currencies=usd"
test_endpoint "CoinGecko Proxy - Markets" "/api/proxy/coingecko/coins/markets?vs_currency=usd&ids=bitcoin"
echo ""

# Test 6: News and Sentiment
echo "6. News and Sentiment"
echo "---------------------"
test_endpoint "Latest News" "/api/news/latest"
test_endpoint "Crypto News" "/api/news/crypto"
test_endpoint "Sentiment" "/api/sentiment"
test_endpoint "Fear & Greed Index" "/api/sentiment/fear-greed"
echo ""

# Test 7: Provider Categories
echo "7. Provider Categories"
echo "---------------------"
test_endpoint "Provider Categories" "/api/providers/categories"
test_endpoint "Market Providers" "/api/providers/market"
test_endpoint "News Providers" "/api/providers/news"
test_endpoint "Sentiment Providers" "/api/providers/sentiment"
echo ""

# Test 8: Cache Statistics
echo "8. Cache and Performance"
echo "------------------------"
test_endpoint "Cache Stats" "/api/system/cache/stats"
echo ""

# Test 9: HuggingFace Integration
echo "9. HuggingFace Integration"
echo "---------------------------"
test_endpoint "HF Engine Health" "/api/hf-engine/health"
test_endpoint "HF Engine Status" "/api/hf-engine/status"
test_endpoint "HF Engine Providers" "/api/hf-engine/providers"
test_endpoint "HF Engine Prices" "/api/hf-engine/prices"
echo ""

# Performance Test
echo "10. Performance Tests"
echo "---------------------"
echo -n "Testing response time for market prices... "
start_time=$(date +%s%N)
curl -s "${BASE_URL}/api/market/prices" > /dev/null
end_time=$(date +%s%N)
duration=$(( (end_time - start_time) / 1000000 ))
if [ $duration -lt 2000 ]; then
    echo -e "${GREEN}✓ PASSED${NC} (${duration}ms)"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠ SLOW${NC} (${duration}ms)"
    ((WARNINGS++))
fi
echo ""

# Summary
echo "===================================="
echo "Test Summary"
echo "===================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All critical tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Please review the output above.${NC}"
    exit 1
fi
