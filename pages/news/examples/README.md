# News API Usage Examples
# مثال‌های استفاده از API اخبار

This folder contains practical examples showing how to query and use the Crypto News API from different programming languages and environments.

این پوشه شامل مثال‌های عملی است که نحوه استفاده از API اخبار کریپتو را از زبان‌های برنامه‌نویسی و محیط‌های مختلف نشان می‌دهد.

---

## Files / فایل‌ها

### 1. `basic-usage.html`
**Interactive HTML example with live demos**
**مثال HTML تعاملی با نمایش زنده**

- Open in browser to see live examples
- Click buttons to test different API queries
- See request details and responses
- No installation required

**How to use:**
```bash
# Open directly in browser
open basic-usage.html

# Or serve locally
python -m http.server 7860
# Then visit: http://localhost:7860/basic-usage.html
```

**Features:**
- ✅ Load all news
- ✅ Filter by sentiment (positive/negative)
- ✅ Search by keyword
- ✅ Limit results
- ✅ View request/response details

---

### 2. `api-client-examples.js`
**JavaScript/Node.js client library and examples**
**کتابخانه و مثال‌های کلاینت جاوااسکریپت/Node.js**

Complete JavaScript client with usage examples.

**How to use in Browser:**
```html
<script type="module">
  import { CryptoNewsClient } from './api-client-examples.js';
  
  const client = new CryptoNewsClient();
  const articles = await client.getAllNews();
  console.log(articles);
</script>
```

**How to use in Node.js:**
```bash
node api-client-examples.js
```

**Available Methods:**
```javascript
const client = new CryptoNewsClient('http://localhost:3000');

// Get all news
await client.getAllNews(limit);

// Get by sentiment
await client.getNewsBySentiment('positive', limit);

// Get by source
await client.getNewsBySource('CoinDesk', limit);

// Search keyword
await client.searchNews('bitcoin', limit);

// Get latest
await client.getLatestNews(count);

// Get statistics
await client.getNewsStatistics();
```

---

### 3. `api-client-examples.py`
**Python client library and examples**
**کتابخانه و مثال‌های کلاینت پایتون**

Complete Python client with usage examples.

**Requirements:**
```bash
pip install requests
```

**How to use:**
```bash
# Run all examples
python api-client-examples.py

# Or import in your code
from api_client_examples import CryptoNewsClient

client = CryptoNewsClient()
articles = client.get_all_news(limit=50)
```

**Available Methods:**
```python
client = CryptoNewsClient('http://localhost:3000')

# Get all news
client.get_all_news(limit)

# Get by sentiment
client.get_news_by_sentiment('positive', limit)

# Get by source
client.get_news_by_source('CoinDesk', limit)

# Search keyword
client.search_news('bitcoin', limit)

# Get latest
client.get_latest_news(count)

# Get statistics
client.get_news_statistics()
```

---

## Quick Examples / مثال‌های سریع

### Example 1: Get All News
### مثال ۱: دریافت تمام اخبار

**JavaScript:**
```javascript
const client = new CryptoNewsClient();
const articles = await client.getAllNews(10);
console.log(`Found ${articles.length} articles`);
```

**Python:**
```python
client = CryptoNewsClient()
articles = client.get_all_news(limit=10)
print(f"Found {len(articles)} articles")
```

**cURL:**
```bash
curl "http://localhost:3000/api/news?limit=10"
```

---

### Example 2: Filter Positive News
### مثال ۲: فیلتر اخبار مثبت

**JavaScript:**
```javascript
const positive = await client.getNewsBySentiment('positive');
positive.forEach(article => console.log(article.title));
```

**Python:**
```python
positive = client.get_news_by_sentiment('positive')
for article in positive:
    print(article['title'])
```

**cURL:**
```bash
curl "http://localhost:3000/api/news?sentiment=positive"
```

---

### Example 3: Search Bitcoin News
### مثال ۳: جستجوی اخبار بیت‌کوین

**JavaScript:**
```javascript
const bitcoin = await client.searchNews('bitcoin');
console.log(`Found ${bitcoin.length} Bitcoin articles`);
```

**Python:**
```python
bitcoin = client.search_news('bitcoin')
print(f"Found {len(bitcoin)} Bitcoin articles")
```

---

### Example 4: Get Statistics
### مثال ۴: دریافت آمار

**JavaScript:**
```javascript
const stats = await client.getNewsStatistics();
console.log(`Total: ${stats.total}`);
console.log(`Positive: ${stats.positive}`);
console.log(`Negative: ${stats.negative}`);
console.log(`Neutral: ${stats.neutral}`);
```

**Python:**
```python
stats = client.get_news_statistics()
print(f"Total: {stats['total']}")
print(f"Positive: {stats['positive']}")
print(f"Negative: {stats['negative']}")
print(f"Neutral: {stats['neutral']}")
```

---

## API Response Format
## فرمت پاسخ API

All API methods return articles in this format:

```json
{
  "title": "Article Title",
  "content": "Article description or content",
  "source": {
    "title": "Source Name"
  },
  "published_at": "2025-11-30T10:00:00Z",
  "url": "https://example.com/article",
  "urlToImage": "https://example.com/image.jpg",
  "author": "Author Name",
  "sentiment": "positive",
  "category": "crypto"
}
```

---

## Error Handling
## مدیریت خطاها

### JavaScript:
```javascript
try {
  const articles = await client.getAllNews();
} catch (error) {
  console.error('Error:', error.message);
  // Handle error
}
```

### Python:
```python
try:
    articles = client.get_all_news()
except Exception as e:
    print(f"Error: {e}")
    # Handle error
```

---

## Common Use Cases
## موارد استفاده رایج

### 1. Display Latest News on Website
```javascript
const client = new CryptoNewsClient();
const latest = await client.getLatestNews(5);

latest.forEach(article => {
  const div = document.createElement('div');
  div.innerHTML = `
    <h3>${article.title}</h3>
    <p>${article.content}</p>
    <a href="${article.url}">Read more</a>
  `;
  document.body.appendChild(div);
});
```

### 2. Monitor Sentiment Trends
```python
client = CryptoNewsClient()
stats = client.get_news_statistics()

positive_ratio = stats['positive'] / stats['total'] * 100
print(f"Market sentiment: {positive_ratio:.1f}% positive")
```

### 3. Create News Alerts
```javascript
const client = new CryptoNewsClient();

// Check for Bitcoin news every 5 minutes
setInterval(async () => {
  const bitcoin = await client.searchNews('bitcoin');
  const recent = bitcoin.filter(a => {
    const age = Date.now() - new Date(a.published_at).getTime();
    return age < 5 * 60 * 1000; // Last 5 minutes
  });
  
  if (recent.length > 0) {
    console.log(`${recent.length} new Bitcoin articles!`);
    // Send notification
  }
}, 5 * 60 * 1000);
```

---

## Testing the Examples
## آزمایش مثال‌ها

### Prerequisites:
1. Server must be running on `localhost:3000`
2. News API should be configured with valid API key

### Run Examples:

**HTML Example:**
```bash
# Open in browser
open basic-usage.html
```

**JavaScript Example:**
```bash
# Node.js environment
node api-client-examples.js
```

**Python Example:**
```bash
# Python environment
python api-client-examples.py
```

---

## Troubleshooting
## رفع مشکلات

### Issue: "Connection refused"
**Solution:** Make sure the server is running:
```bash
# Check if server is running
curl http://localhost:3000/api/news

# If not, start the server
npm start
# or
python server.py
```

### Issue: "No articles returned"
**Solution:** 
- Check your internet connection
- Verify News API key is valid
- Check API rate limits (100 requests/day for free tier)

### Issue: "CORS error in browser"
**Solution:** The server must allow CORS for browser requests. Add CORS headers or use the same domain.

---

## Additional Resources
## منابع اضافی

- Main README: `../README.md`
- API Usage Guide: `../API-USAGE-GUIDE.md`
- Implementation Summary: `../IMPLEMENTATION-SUMMARY.md`
- Configuration: `../news-config.js`

---

## License
These examples are provided as-is for demonstration purposes.
این مثال‌ها برای اهداف نمایشی ارائه شده‌اند.





















