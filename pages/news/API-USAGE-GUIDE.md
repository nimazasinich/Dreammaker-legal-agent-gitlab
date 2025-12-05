# API Usage Guide - How to Use the Crypto Monitor Services

## راهنمای استفاده از API - چگونه از سرویس‌های کریپتو مانیتور استفاده کنیم

---

## English Guide

### Overview
This application provides cryptocurrency monitoring services through a web interface and backend APIs. Users can access real-time crypto prices, news, and market data.

### Architecture

```
┌─────────────────┐
│   User/Browser  │
└────────┬────────┘
         │ HTTP Requests
         ▼
┌─────────────────┐
│  Frontend (UI)  │
│  - HTML/CSS/JS  │
│  - React/Vue    │
└────────┬────────┘
         │ API Calls
         ▼
┌─────────────────┐
│  Backend Server │
│  - Node.js/Py   │
│  - API Routes   │
└────────┬────────┘
         │
         ├─────────────────┐
         ▼                 ▼
┌─────────────┐   ┌──────────────┐
│  News API   │   │  Crypto APIs │
│  External   │   │  CoinGecko   │
└─────────────┘   └──────────────┘
```

### How to Use the Services

#### 1. **News Service**

**Access Method**: Web Browser
- Navigate to: `http://localhost:PORT/static/pages/news/index.html`
- The page automatically loads latest cryptocurrency news

**JavaScript API Usage**:
```javascript
// The news page uses this internally
const newsPage = new NewsPage();
await newsPage.loadNews();

// Get filtered articles
newsPage.currentFilters.keyword = 'bitcoin';
newsPage.applyFilters();
```

**Configuration**:
```javascript
// Edit news-config.js
export const NEWS_CONFIG = {
  apiKey: 'YOUR_API_KEY',
  defaultQuery: 'cryptocurrency OR bitcoin',
  pageSize: 100
};
```

#### 2. **Backend API Endpoints**

**News Endpoint**:
```http
GET /api/news
```

**Query Parameters**:
- `source`: Filter by news source
- `sentiment`: Filter by sentiment (positive/negative/neutral)
- `limit`: Number of articles (default: 100)

**Example Request**:
```bash
# Using curl
curl "http://localhost:3000/api/news?limit=50&sentiment=positive"

# Using JavaScript fetch
fetch('/api/news?limit=50')
  .then(response => response.json())
  .then(data => console.log(data.articles));

# Using Python requests
import requests
response = requests.get('http://localhost:3000/api/news?limit=50')
articles = response.json()['articles']
```

**Response Format**:
```json
{
  "articles": [
    {
      "title": "Bitcoin Reaches New High",
      "content": "Article description...",
      "source": {
        "title": "CryptoNews"
      },
      "published_at": "2025-11-30T10:00:00Z",
      "url": "https://example.com/article",
      "sentiment": "positive",
      "category": "market"
    }
  ],
  "total": 50,
  "fallback": false
}
```

#### 3. **Cryptocurrency Data Endpoints**

**Get Crypto Prices**:
```http
GET /api/crypto/prices
```

**Example**:
```bash
curl "http://localhost:3000/api/crypto/prices?symbols=BTC,ETH,ADA"
```

**Get Market Data**:
```http
GET /api/crypto/market
```

**Get Historical Data**:
```http
GET /api/crypto/history?symbol=BTC&days=30
```

### Client-Side Integration

#### HTML Page
```html
<!DOCTYPE html>
<html>
<head>
  <title>Crypto Monitor</title>
</head>
<body>
  <div id="news-container"></div>
  
  <script type="module">
    // Load news dynamically
    async function loadNews() {
      const response = await fetch('/api/news?limit=10');
      const data = await response.json();
      
      const container = document.getElementById('news-container');
      container.innerHTML = data.articles.map(article => `
        <div class="news-card">
          <h3>${article.title}</h3>
          <p>${article.content}</p>
          <a href="${article.url}">Read more</a>
        </div>
      `).join('');
    }
    
    loadNews();
  </script>
</body>
</html>
```

#### React Component
```jsx
import { useState, useEffect } from 'react';

function NewsComponent() {
  const [articles, setArticles] = useState([]);
  
  useEffect(() => {
    fetch('/api/news?limit=20')
      .then(res => res.json())
      .then(data => setArticles(data.articles));
  }, []);
  
  return (
    <div>
      {articles.map(article => (
        <div key={article.url}>
          <h3>{article.title}</h3>
          <p>{article.content}</p>
        </div>
      ))}
    </div>
  );
}
```

#### Vue Component
```vue
<template>
  <div>
    <div v-for="article in articles" :key="article.url">
      <h3>{{ article.title }}</h3>
      <p>{{ article.content }}</p>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return { articles: [] };
  },
  async mounted() {
    const response = await fetch('/api/news?limit=20');
    const data = await response.json();
    this.articles = data.articles;
  }
}
</script>
```

### Error Handling

**Handle API Errors**:
```javascript
async function fetchNewsWithErrorHandling() {
  try {
    const response = await fetch('/api/news');
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication failed');
      } else if (response.status === 429) {
        throw new Error('Too many requests');
      } else if (response.status === 500) {
        throw new Error('Server error');
      }
    }
    
    const data = await response.json();
    return data.articles;
    
  } catch (error) {
    console.error('Error fetching news:', error);
    // Show user-friendly error message
    alert(`Failed to load news: ${error.message}`);
    return [];
  }
}
```

### Rate Limiting

**API Limits**:
- News API: 100 requests/day (free tier)
- Backend API: Configurable (default: 1000 requests/hour)

**Handle Rate Limits**:
```javascript
// Implement caching
const cache = new Map();
const CACHE_TTL = 60000; // 1 minute

async function fetchWithCache(url) {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const response = await fetch(url);
  const data = await response.json();
  
  cache.set(url, {
    data,
    timestamp: Date.now()
  });
  
  return data;
}
```

### WebSocket Integration (Real-time Updates)

```javascript
// Connect to WebSocket for real-time crypto prices
const ws = new WebSocket('ws://localhost:3000/ws/crypto');

ws.onopen = () => {
  console.log('Connected to crypto feed');
  // Subscribe to specific coins
  ws.send(JSON.stringify({
    action: 'subscribe',
    symbols: ['BTC', 'ETH', 'ADA']
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Price update:', data);
  // Update UI with new prices
  updatePriceDisplay(data);
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('Disconnected from crypto feed');
  // Attempt reconnection
  setTimeout(connectWebSocket, 5000);
};
```

---

## راهنمای فارسی

### نحوه استفاده از سرویس‌ها

#### ۱. **سرویس اخبار**

**روش دسترسی**: مرورگر وب
- آدرس: `http://localhost:PORT/static/pages/news/index.html`
- صفحه به صورت خودکار آخرین اخبار ارز دیجیتال را بارگذاری می‌کند

**استفاده از API در جاوااسکریپت**:
```javascript
// صفحه اخبار از این کد استفاده می‌کند
const newsPage = new NewsPage();
await newsPage.loadNews();

// فیلتر کردن مقالات
newsPage.currentFilters.keyword = 'bitcoin';
newsPage.applyFilters();
```

#### ۲. **نقاط پایانی API سرور**

**دریافت اخبار**:
```http
GET /api/news
```

**پارامترهای درخواست**:
- `source`: فیلتر بر اساس منبع خبر
- `sentiment`: فیلتر بر اساس احساسات (مثبت/منفی/خنثی)
- `limit`: تعداد مقالات (پیش‌فرض: ۱۰۰)

**مثال درخواست**:
```bash
# استفاده از curl
curl "http://localhost:3000/api/news?limit=50&sentiment=positive"

# استفاده از fetch در جاوااسکریپت
fetch('/api/news?limit=50')
  .then(response => response.json())
  .then(data => console.log(data.articles));

# استفاده از Python
import requests
response = requests.get('http://localhost:3000/api/news?limit=50')
articles = response.json()['articles']
```

**فرمت پاسخ**:
```json
{
  "articles": [
    {
      "title": "بیت‌کوین به رکورد جدید رسید",
      "content": "توضیحات مقاله...",
      "source": {
        "title": "اخبار کریپتو"
      },
      "published_at": "2025-11-30T10:00:00Z",
      "url": "https://example.com/article",
      "sentiment": "positive"
    }
  ],
  "total": 50
}
```

#### ۳. **نقاط پایانی داده‌های ارز دیجیتال**

**دریافت قیمت‌ها**:
```bash
curl "http://localhost:3000/api/crypto/prices?symbols=BTC,ETH,ADA"
```

**دریافت داده‌های بازار**:
```bash
curl "http://localhost:3000/api/crypto/market"
```

**دریافت داده‌های تاریخی**:
```bash
curl "http://localhost:3000/api/crypto/history?symbol=BTC&days=30"
```

### یکپارچه‌سازی با برنامه کاربردی

#### صفحه HTML
```html
<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
  <meta charset="UTF-8">
  <title>مانیتور کریپتو</title>
</head>
<body>
  <div id="news-container"></div>
  
  <script type="module">
    // بارگذاری اخبار
    async function loadNews() {
      const response = await fetch('/api/news?limit=10');
      const data = await response.json();
      
      const container = document.getElementById('news-container');
      container.innerHTML = data.articles.map(article => `
        <div class="news-card">
          <h3>${article.title}</h3>
          <p>${article.content}</p>
          <a href="${article.url}">ادامه مطلب</a>
        </div>
      `).join('');
    }
    
    loadNews();
  </script>
</body>
</html>
```

### مدیریت خطاها

```javascript
async function fetchNewsWithErrorHandling() {
  try {
    const response = await fetch('/api/news');
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('احراز هویت ناموفق بود');
      } else if (response.status === 429) {
        throw new Error('تعداد درخواست‌ها زیاد است');
      } else if (response.status === 500) {
        throw new Error('خطای سرور');
      }
    }
    
    const data = await response.json();
    return data.articles;
    
  } catch (error) {
    console.error('خطا در دریافت اخبار:', error);
    alert(`خطا در بارگذاری اخبار: ${error.message}`);
    return [];
  }
}
```

### محدودیت‌های استفاده

**محدودیت‌های API**:
- News API: ۱۰۰ درخواست در روز (نسخه رایگان)
- Backend API: قابل تنظیم (پیش‌فرض: ۱۰۰۰ درخواست در ساعت)

### به‌روزرسانی‌های زنده (WebSocket)

```javascript
// اتصال به WebSocket برای قیمت‌های لحظه‌ای
const ws = new WebSocket('ws://localhost:3000/ws/crypto');

ws.onopen = () => {
  console.log('اتصال برقرار شد');
  // اشتراک در سکه‌های خاص
  ws.send(JSON.stringify({
    action: 'subscribe',
    symbols: ['BTC', 'ETH', 'ADA']
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('به‌روزرسانی قیمت:', data);
  // به‌روزرسانی رابط کاربری
  updatePriceDisplay(data);
};
```

---

## Quick Reference

### Common Queries

| Purpose | Endpoint | Example |
|---------|----------|---------|
| Get all news | `/api/news` | `GET /api/news?limit=50` |
| Filter by source | `/api/news?source=X` | `GET /api/news?source=CoinDesk` |
| Positive news only | `/api/news?sentiment=positive` | `GET /api/news?sentiment=positive&limit=20` |
| Search keyword | Client-side filter | `newsPage.currentFilters.keyword = 'bitcoin'` |
| Get BTC price | `/api/crypto/prices?symbols=BTC` | `GET /api/crypto/prices?symbols=BTC` |
| Market overview | `/api/crypto/market` | `GET /api/crypto/market` |

### Response Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Process data |
| 401 | Unauthorized | Check API key |
| 429 | Rate limited | Wait and retry |
| 500 | Server error | Use fallback data |
| 503 | Service unavailable | Retry later |




































