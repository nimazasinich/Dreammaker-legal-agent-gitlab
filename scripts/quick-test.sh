#!/bin/bash

# Quick Test Script for UI Error States & Retry Logic
# Usage: ./scripts/quick-test.sh

set -e

echo "🧪 Quick Test - UI Error States & Retry Logic"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
PASSED=0
FAILED=0
WARNINGS=0

# Function to check if port is in use
check_port() {
  local port=$1
  if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
    return 0
  else
    return 1
  fi
}

# Function to test endpoint
test_endpoint() {
  local url=$1
  local name=$2
  echo -n "Testing $name... "

  if curl -s -f -m 3 "$url" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASSED++))
    return 0
  else
    echo -e "${RED}❌ FAIL${NC}"
    ((FAILED++))
    return 1
  fi
}

# Function to test JSON endpoint
test_json_endpoint() {
  local url=$1
  local name=$2
  echo -n "Testing $name... "

  local response=$(curl -s -m 3 "$url" 2>&1)
  if echo "$response" | jq empty 2>/dev/null; then
    echo -e "${GREEN}✅ PASS (valid JSON)${NC}"
    echo "  Response preview: $(echo "$response" | jq -c . 2>/dev/null | head -c 100)..."
    ((PASSED++))
    return 0
  else
    echo -e "${RED}❌ FAIL (invalid or no response)${NC}"
    ((FAILED++))
    return 1
  fi
}

echo "📋 Step 1: Environment Check"
echo "----------------------------"

# Check Node version
echo -n "Node.js version: "
node --version

# Check npm version
echo -n "npm version: "
npm --version

echo ""

echo "📋 Step 2: Process Check"
echo "------------------------"

# Check if backend is running
if check_port 8001; then
  echo -e "Backend (port 8001): ${GREEN}✅ Running${NC}"
  BACKEND_RUNNING=true
else
  echo -e "Backend (port 8001): ${RED}❌ Not running${NC}"
  BACKEND_RUNNING=false
  ((WARNINGS++))
fi

# Check if frontend is running
if check_port 5173; then
  echo -e "Frontend (port 5173): ${GREEN}✅ Running${NC}"
  FRONTEND_RUNNING=true
else
  echo -e "Frontend (port 5173): ${YELLOW}⚠️  Not running${NC}"
  FRONTEND_RUNNING=false
  ((WARNINGS++))
fi

echo ""

if [ "$BACKEND_RUNNING" = true ]; then
  echo "📋 Step 3: Backend API Tests"
  echo "----------------------------"

  # Test health endpoint
  test_json_endpoint "http://localhost:8001/api/system/health" "Health endpoint"

  # Test OHLCV endpoint
  test_json_endpoint "http://localhost:8001/market/ohlcv?symbol=BTCUSDT&timeframe=1h&limit=10" "OHLCV endpoint"

  # Test market prices
  test_json_endpoint "http://localhost:8001/market/prices?symbols=BTCUSDT,ETHUSDT" "Market prices"

  echo ""
else
  echo "📋 Step 3: Backend API Tests"
  echo "----------------------------"
  echo -e "${YELLOW}⚠️  Skipped (backend not running)${NC}"
  echo ""
fi

if [ "$FRONTEND_RUNNING" = true ]; then
  echo "📋 Step 4: Frontend Tests"
  echo "------------------------"

  # Test frontend serving
  test_endpoint "http://localhost:5173" "Frontend root"

  echo ""
else
  echo "📋 Step 4: Frontend Tests"
  echo "------------------------"
  echo -e "${YELLOW}⚠️  Skipped (frontend not running)${NC}"
  echo ""
fi

echo "📋 Step 5: File Checks"
echo "---------------------"

# Check if new files exist
FILES=(
  "src/types/loadState.ts"
  "src/components/ui/ErrorStateCard.tsx"
  "TEST_PLAN.md"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo -e "$file: ${GREEN}✅ Exists${NC}"
    ((PASSED++))
  else
    echo -e "$file: ${RED}❌ Missing${NC}"
    ((FAILED++))
  fi
done

echo ""

echo "📋 Step 6: TypeScript Syntax Check"
echo "----------------------------------"

# Check if new files compile (without full build)
echo "Checking ErrorStateCard.tsx..."
if npx tsc --noEmit --skipLibCheck src/components/ui/ErrorStateCard.tsx 2>&1 | grep -q "error TS"; then
  echo -e "ErrorStateCard.tsx: ${RED}❌ Has TypeScript errors${NC}"
  ((FAILED++))
else
  echo -e "ErrorStateCard.tsx: ${GREEN}✅ No syntax errors${NC}"
  ((PASSED++))
fi

echo "Checking loadState.ts..."
if npx tsc --noEmit --skipLibCheck src/types/loadState.ts 2>&1 | grep -q "error TS"; then
  echo -e "loadState.ts: ${RED}❌ Has TypeScript errors${NC}"
  ((FAILED++))
else
  echo -e "loadState.ts: ${GREEN}✅ No syntax errors${NC}"
  ((PASSED++))
fi

echo ""

echo "=============================================="
echo "📊 Test Summary"
echo "=============================================="
echo -e "Passed:   ${GREEN}$PASSED${NC}"
echo -e "Failed:   ${RED}$FAILED${NC}"
echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"
echo ""

if [ $FAILED -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo -e "${GREEN}✅ All tests passed!${NC}"
  exit 0
elif [ $FAILED -eq 0 ]; then
  echo -e "${YELLOW}⚠️  Tests passed with warnings.${NC}"
  echo ""
  echo "💡 Recommendations:"
  if [ "$BACKEND_RUNNING" = false ]; then
    echo "   - Start backend: npm run dev:backend"
  fi
  if [ "$FRONTEND_RUNNING" = false ]; then
    echo "   - Start frontend: npm run dev"
  fi
  exit 0
else
  echo -e "${RED}❌ Some tests failed.${NC}"
  echo ""
  echo "💡 Check the failures above and fix them."
  exit 1
fi
