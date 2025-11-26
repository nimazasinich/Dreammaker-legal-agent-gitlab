#!/bin/bash

# =============================================================================
# Data Retrieval CLI Commands for BoltAI Crypto Trading Platform
# =============================================================================
# This script provides commands for testing, validating, and deploying
# the data retrieval system.
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_BASE="${VITE_API_BASE:-http://localhost:8001}"
TEST_SYMBOLS="BTC,ETH,SOL"

# =============================================================================
# Helper Functions
# =============================================================================

print_header() {
    echo -e "\n${BLUE}==============================================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}==============================================================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

check_dependency() {
    if ! command -v $1 &> /dev/null; then
        print_error "$1 is not installed. Please install it first."
        exit 1
    fi
}

# =============================================================================
# Test Commands
# =============================================================================

test_api_health() {
    print_header "Testing API Health"
    
    echo "Testing: ${API_BASE}/api/health"
    response=$(curl -s -o /dev/null -w "%{http_code}" "${API_BASE}/api/health" 2>/dev/null || echo "000")
    
    if [ "$response" = "200" ]; then
        print_success "API is healthy (HTTP $response)"
    else
        print_error "API health check failed (HTTP $response)"
        return 1
    fi
}

test_market_data() {
    print_header "Testing Market Data Endpoints"
    
    # Test market data endpoint
    echo "Testing: ${API_BASE}/api/market?limit=5"
    response=$(curl -s "${API_BASE}/api/market?limit=5" 2>/dev/null)
    
    if [ -n "$response" ] && [ "$response" != "null" ]; then
        echo "$response" | jq '.[0:2]' 2>/dev/null || echo "$response"
        print_success "Market data retrieved successfully"
    else
        print_warning "No market data returned"
    fi
    
    # Test single symbol
    echo -e "\nTesting: ${API_BASE}/api/market-data/BTC"
    response=$(curl -s "${API_BASE}/api/market-data/BTC" 2>/dev/null)
    
    if [ -n "$response" ] && [ "$response" != "null" ]; then
        echo "$response" | jq '.' 2>/dev/null || echo "$response"
        print_success "BTC data retrieved successfully"
    else
        print_warning "No BTC data returned"
    fi
}

test_historical_data() {
    print_header "Testing Historical Data (OHLCV)"
    
    echo "Testing: ${API_BASE}/api/market/history?symbol=BTC&timeframe=1h&limit=10"
    response=$(curl -s "${API_BASE}/api/market/history?symbol=BTC&timeframe=1h&limit=10" 2>/dev/null)
    
    if [ -n "$response" ] && [ "$response" != "null" ]; then
        echo "$response" | jq '.[0:3]' 2>/dev/null || echo "$response"
        print_success "Historical data retrieved successfully"
    else
        print_warning "No historical data returned"
    fi
}

test_sentiment() {
    print_header "Testing Sentiment Data"
    
    echo "Testing: ${API_BASE}/api/sentiment"
    response=$(curl -s "${API_BASE}/api/sentiment" 2>/dev/null)
    
    if [ -n "$response" ] && [ "$response" != "null" ]; then
        echo "$response" | jq '.' 2>/dev/null || echo "$response"
        print_success "Sentiment data retrieved successfully"
    else
        print_warning "No sentiment data returned"
    fi
}

test_news() {
    print_header "Testing News Data"
    
    echo "Testing: ${API_BASE}/api/news/latest?limit=3"
    response=$(curl -s "${API_BASE}/api/news/latest?limit=3" 2>/dev/null)
    
    if [ -n "$response" ] && [ "$response" != "null" ]; then
        echo "$response" | jq '.news[0:2]' 2>/dev/null || echo "$response"
        print_success "News data retrieved successfully"
    else
        print_warning "No news data returned"
    fi
}

test_data_source_config() {
    print_header "Testing Data Source Configuration"
    
    echo "Testing: ${API_BASE}/api/config/data-source"
    response=$(curl -s "${API_BASE}/api/config/data-source" 2>/dev/null)
    
    if [ -n "$response" ]; then
        echo "$response" | jq '.' 2>/dev/null || echo "$response"
        print_success "Data source configuration retrieved"
    else
        print_warning "No data source configuration returned"
    fi
}

test_external_providers() {
    print_header "Testing External Data Providers Directly"
    
    # Test CoinGecko
    echo "Testing CoinGecko API..."
    response=$(curl -s "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd" 2>/dev/null)
    if [ -n "$response" ] && echo "$response" | grep -q "bitcoin"; then
        print_success "CoinGecko: $(echo $response | jq -r '.bitcoin.usd')"
    else
        print_error "CoinGecko failed"
    fi
    
    # Test CoinCap
    echo "Testing CoinCap API..."
    response=$(curl -s "https://api.coincap.io/v2/assets/bitcoin" 2>/dev/null)
    if [ -n "$response" ] && echo "$response" | grep -q "priceUsd"; then
        print_success "CoinCap: $(echo $response | jq -r '.data.priceUsd' | cut -c1-10)"
    else
        print_error "CoinCap failed"
    fi
    
    # Test Alternative.me (Fear & Greed)
    echo "Testing Alternative.me Fear & Greed Index..."
    response=$(curl -s "https://api.alternative.me/fng/?limit=1" 2>/dev/null)
    if [ -n "$response" ] && echo "$response" | grep -q "value"; then
        print_success "Fear & Greed Index: $(echo $response | jq -r '.data[0].value') ($(echo $response | jq -r '.data[0].value_classification'))"
    else
        print_error "Alternative.me failed"
    fi
    
    # Test Kraken
    echo "Testing Kraken Public API..."
    response=$(curl -s "https://api.kraken.com/0/public/Ticker?pair=XBTUSD" 2>/dev/null)
    if [ -n "$response" ] && echo "$response" | grep -q "result"; then
        print_success "Kraken: Available"
    else
        print_error "Kraken failed"
    fi
}

run_all_tests() {
    print_header "Running All Data Retrieval Tests"
    
    test_api_health || true
    test_market_data || true
    test_historical_data || true
    test_sentiment || true
    test_news || true
    test_data_source_config || true
    test_external_providers || true
    
    print_header "Test Summary Complete"
}

# =============================================================================
# Validation Commands
# =============================================================================

validate_config_files() {
    print_header "Validating Configuration Files"
    
    configs=(
        "config/api.json"
        "config/exchanges.json"
        "config/providers_config.json"
        "config/feature-flags.json"
    )
    
    for config in "${configs[@]}"; do
        if [ -f "$config" ]; then
            if jq empty "$config" 2>/dev/null; then
                print_success "$config is valid JSON"
            else
                print_error "$config has invalid JSON"
            fi
        else
            print_warning "$config not found"
        fi
    done
}

validate_env_vars() {
    print_header "Validating Environment Variables"
    
    env_vars=(
        "VITE_API_BASE"
        "HUGGINGFACE_API_KEY"
        "HF_TOKEN_B64"
        "CMC_API_KEY"
    )
    
    for var in "${env_vars[@]}"; do
        if [ -n "${!var}" ]; then
            # Mask the value for security
            value="${!var}"
            masked="${value:0:4}...${value: -4}"
            print_success "$var is set: $masked"
        else
            print_warning "$var is not set"
        fi
    done
}

# =============================================================================
# Deployment Commands
# =============================================================================

install_dependencies() {
    print_header "Installing Dependencies"
    
    if [ -f "package.json" ]; then
        echo "Installing npm dependencies..."
        npm install
        print_success "Dependencies installed"
    else
        print_error "No package.json found"
        exit 1
    fi
}

build_project() {
    print_header "Building Project"
    
    echo "Running TypeScript compilation..."
    npm run build 2>/dev/null || npx tsc
    
    if [ $? -eq 0 ]; then
        print_success "Build completed successfully"
    else
        print_error "Build failed"
        exit 1
    fi
}

start_development() {
    print_header "Starting Development Server"
    
    echo "Starting backend server..."
    npm run dev &
    
    sleep 5
    
    if curl -s "${API_BASE}/api/health" > /dev/null 2>&1; then
        print_success "Development server started"
    else
        print_warning "Server may still be starting..."
    fi
}

# =============================================================================
# Cache Management
# =============================================================================

clear_cache() {
    print_header "Clearing Data Caches"
    
    # Clear Redis cache if available
    if command -v redis-cli &> /dev/null; then
        echo "Clearing Redis cache..."
        redis-cli FLUSHDB 2>/dev/null || print_warning "Redis not running"
    fi
    
    # Clear local cache directories
    if [ -d "data/cache" ]; then
        echo "Clearing local cache..."
        rm -rf data/cache/*
        print_success "Local cache cleared"
    fi
    
    print_success "Cache clearing complete"
}

# =============================================================================
# Reporting
# =============================================================================

generate_status_report() {
    print_header "Generating Data Retrieval Status Report"
    
    report_file="reports/data_retrieval_status_$(date +%Y%m%d_%H%M%S).json"
    
    echo "{"
    echo "  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
    echo "  \"endpoints\": {"
    
    # Test each endpoint
    endpoints=(
        "/api/health"
        "/api/market?limit=1"
        "/api/sentiment"
        "/api/config/data-source"
    )
    
    first=true
    for endpoint in "${endpoints[@]}"; do
        if [ "$first" = true ]; then
            first=false
        else
            echo ","
        fi
        
        status=$(curl -s -o /dev/null -w "%{http_code}" "${API_BASE}${endpoint}" 2>/dev/null || echo "000")
        latency=$(curl -s -o /dev/null -w "%{time_total}" "${API_BASE}${endpoint}" 2>/dev/null || echo "0")
        
        echo -n "    \"$endpoint\": {\"status\": $status, \"latency\": \"${latency}s\"}"
    done
    
    echo ""
    echo "  }"
    echo "}"
    
    print_success "Status report generated"
}

# =============================================================================
# Usage
# =============================================================================

show_usage() {
    echo ""
    echo "Data Retrieval CLI Commands for BoltAI Crypto Trading Platform"
    echo ""
    echo "Usage: $0 <command>"
    echo ""
    echo "Test Commands:"
    echo "  test-health        Test API health endpoint"
    echo "  test-market        Test market data endpoints"
    echo "  test-historical    Test historical OHLCV data"
    echo "  test-sentiment     Test sentiment data"
    echo "  test-news          Test news data"
    echo "  test-config        Test data source configuration"
    echo "  test-providers     Test external data providers directly"
    echo "  test-all           Run all tests"
    echo ""
    echo "Validation Commands:"
    echo "  validate-config    Validate configuration JSON files"
    echo "  validate-env       Validate environment variables"
    echo ""
    echo "Deployment Commands:"
    echo "  install            Install project dependencies"
    echo "  build              Build the project"
    echo "  start-dev          Start development server"
    echo ""
    echo "Utility Commands:"
    echo "  clear-cache        Clear all data caches"
    echo "  status-report      Generate status report"
    echo ""
    echo "Environment Variables:"
    echo "  VITE_API_BASE      API base URL (default: http://localhost:8001)"
    echo ""
}

# =============================================================================
# Main
# =============================================================================

case "$1" in
    test-health)
        check_dependency curl
        test_api_health
        ;;
    test-market)
        check_dependency curl
        check_dependency jq
        test_market_data
        ;;
    test-historical)
        check_dependency curl
        check_dependency jq
        test_historical_data
        ;;
    test-sentiment)
        check_dependency curl
        check_dependency jq
        test_sentiment
        ;;
    test-news)
        check_dependency curl
        check_dependency jq
        test_news
        ;;
    test-config)
        check_dependency curl
        check_dependency jq
        test_data_source_config
        ;;
    test-providers)
        check_dependency curl
        check_dependency jq
        test_external_providers
        ;;
    test-all)
        check_dependency curl
        check_dependency jq
        run_all_tests
        ;;
    validate-config)
        check_dependency jq
        validate_config_files
        ;;
    validate-env)
        validate_env_vars
        ;;
    install)
        install_dependencies
        ;;
    build)
        build_project
        ;;
    start-dev)
        start_development
        ;;
    clear-cache)
        clear_cache
        ;;
    status-report)
        check_dependency curl
        generate_status_report
        ;;
    *)
        show_usage
        exit 1
        ;;
esac

exit 0
