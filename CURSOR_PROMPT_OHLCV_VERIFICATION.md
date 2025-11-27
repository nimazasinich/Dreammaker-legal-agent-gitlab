# پرامپت برای تست و بررسی صحت داده‌های OHLCV

این پرامپت برای استفاده در Cursor طراحی شده است تا بتواند داده‌های OHLCV را از APIهای مختلف دریافت کرده و صحت آن‌ها را بررسی کند.

## دستورالعمل برای Cursor

```markdown
# Task: Verify OHLCV Data from Multiple Cryptocurrency APIs

I need you to test and verify OHLCV (Open, High, Low, Close, Volume) data from multiple cryptocurrency APIs to ensure they provide accurate, complete, and up-to-date data. The goal is to validate that all configured data sources in the platform are functioning correctly and returning valid OHLCV data.

## Context

The platform integrates multiple data sources for cryptocurrency market data:
- CoinGecko (primary market data source)
- Binance (exchange API)
- CryptoCompare (fallback market data)
- CoinMarketCap (market cap data)
- KuCoin (exchange API, if configured)

## Task Requirements

1. **Run the OHLCV Verification Script**
   - Execute: `npm run test:ohlcv`
   - Or directly: `npx tsx scripts/test-ohlcv-data-verification.ts`
   - The script will test all configured APIs and generate a detailed report

2. **Verify Each API Endpoint**

   ### CoinGecko API
   - **Endpoint**: `/api/proxy/coingecko/coins/bitcoin/ohlc?vs_currency=usd&days=30`
   - **Expected**: 30 days of daily OHLCV data
   - **Validation Checks**:
     - Response contains array of data points
     - Each data point has: timestamp, open, high, low, close
     - No null or missing values
     - Price relationships are valid (high >= low, high >= open, high >= close, etc.)
     - Timestamps are sequential
     - Data is recent (within last 30 days)

   ### Binance API
   - **Endpoint**: `/api/proxy/binance/klines?symbol=BTCUSDT&interval=1d&limit=365`
   - **Expected**: 365 days of daily OHLCV data
   - **Validation Checks**:
     - Response contains array of klines
     - Each kline has: openTime, open, high, low, close, volume, closeTime
     - Volume is positive
     - Price values are valid numbers
     - No gaps in data (consecutive days)
     - Data format matches Binance API specification

   ### CryptoCompare API
   - **Endpoint**: `/api/market/cryptocompare-prices?symbols=BTC`
   - **Or Direct**: `https://min-api.cryptocompare.com/data/v2/histoday?fsym=BTC&tsym=USD&limit=200`
   - **Expected**: 200 days of historical daily data
   - **Validation Checks**:
     - Response contains historical data array
     - Each point has: time, open, high, low, close, volumefrom, volumeto
     - Data is sorted by timestamp (ascending or descending)
     - No missing days in the range
     - Volume values are consistent

   ### CoinMarketCap API
   - **Endpoint**: `/api/market/coinmarketcap-prices?symbols=BTC`
   - **Note**: Free tier may not provide historical OHLCV
   - **Validation Checks**:
     - Current price data is available
     - Response format is valid
     - API key is working (if configured)

   ### KuCoin API (if configured)
   - **Endpoint**: `/api/market/ohlcv?symbol=BTC-USDT&interval=1d&limit=200`
   - **Expected**: 200 days of daily OHLCV data
   - **Validation Checks**:
     - Response contains OHLCV array
     - Data points are complete
     - Timestamps are valid
     - Price and volume data is consistent

3. **Data Quality Checks**

   For each API response, verify:
   - ✅ **Completeness**: All expected data points are present
   - ✅ **Accuracy**: Price relationships are mathematically correct
   - ✅ **Consistency**: No gaps or missing timestamps
   - ✅ **Validity**: No null, undefined, or invalid values
   - ✅ **Recency**: Data is up-to-date (latest data point is recent)
   - ✅ **Format**: Data structure matches API specification

4. **Cross-Reference Validation**

   Compare data from different sources:
   - CoinGecko vs Binance closing prices (should be similar)
   - Volume data consistency across sources
   - Timestamp alignment (same dates should have similar prices)

5. **Error Handling**

   Check for:
   - Network errors (timeout, connection refused)
   - API errors (rate limiting, authentication failures)
   - Data format errors (unexpected structure)
   - Missing data (gaps in time series)

## Expected Output

The script should generate:
1. **Console Output**: Real-time test results with color-coded status
2. **JSON Report**: Detailed results saved to `cursor_reports/ohlcv-verification-{timestamp}.json`
3. **Summary Statistics**:
   - Total APIs tested
   - Successful vs failed APIs
   - Total data points retrieved
   - Average response times
   - Best and worst performing APIs

## Report Format

The JSON report should include:
```json
{
  "timestamp": "ISO timestamp",
  "totalApis": 5,
  "successfulApis": 4,
  "failedApis": 1,
  "results": [
    {
      "api": "CoinGecko",
      "success": true,
      "dataPoints": 30,
      "expectedDataPoints": 30,
      "missingDataPoints": 0,
      "errors": [],
      "warnings": [],
      "responseTime": 1234,
      "dataQuality": {
        "hasNulls": false,
        "hasGaps": false,
        "priceConsistency": true,
        "volumeConsistency": true
      },
      "sampleData": [...]
    }
  ],
  "summary": {
    "bestPerformer": "CoinGecko",
    "worstPerformer": "API_NAME",
    "averageResponseTime": 1500,
    "totalDataPoints": 795
  }
}
```

## Troubleshooting

If tests fail:
1. Check if server is running: `curl http://localhost:8000/api/health`
2. Verify API keys in `config/api.json` and `config/providers_config.json`
3. Check network connectivity to external APIs
4. Review server logs for errors
5. Test endpoints manually with curl

## Quick Test Commands

```bash
# Full verification test
npm run test:ohlcv

# Simple bash test (faster, less detailed)
npm run test:ohlcv:simple

# Test with custom base URL
API_BASE_URL=http://localhost:8000 npm run test:ohlcv

# Test specific API manually
curl "http://localhost:8000/api/proxy/coingecko/coins/bitcoin/ohlc?vs_currency=usd&days=30"
curl "http://localhost:8000/api/proxy/binance/klines?symbol=BTCUSDT&interval=1d&limit=365"
```

## Success Criteria

✅ All primary APIs (CoinGecko, Binance, CryptoCompare) return valid data
✅ No critical errors in data validation
✅ Data points match expected counts (within 5% tolerance)
✅ Response times are reasonable (< 5 seconds per API)
✅ No null or invalid values in critical fields
✅ Price relationships are mathematically correct
✅ Timestamps are sequential without major gaps

## Next Steps After Verification

1. If all tests pass: Data sources are working correctly
2. If some tests fail: Review error messages and fix configuration
3. If data quality issues found: Investigate specific APIs and consider fallback options
4. Update documentation with any findings
5. Schedule regular verification tests (daily/weekly)

---

**Note**: This verification should be run regularly to ensure data quality and API reliability. Consider adding it to CI/CD pipeline for automated testing.
```

## نحوه استفاده

1. **اجرای تست کامل**:
   ```bash
   npm run test:ohlcv
   ```

2. **اجرای تست ساده** (برای بررسی سریع):
   ```bash
   npm run test:ohlcv:simple
   ```

3. **استفاده در Cursor**:
   - این فایل را در Cursor باز کنید
   - از Cursor بخواهید که این پرامپت را اجرا کند
   - یا مستقیماً دستور `npm run test:ohlcv` را اجرا کنید

## خروجی مورد انتظار

اسکریپت یک گزارش جامع تولید می‌کند که شامل:
- وضعیت هر API (موفق/ناموفق)
- تعداد داده‌های دریافت شده
- خطاها و هشدارها
- نمونه داده‌ها
- آمار عملکرد کلی

گزارش در فایل JSON ذخیره می‌شود و همچنین در کنسول نمایش داده می‌شود.
