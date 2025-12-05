/**
 * نمونه کدهای استفاده از API اخبار کریپتو
 * Crypto News API Client Examples in JavaScript/Node.js
 * 
 * این فایل شامل مثال‌های مختلف برای استفاده از API اخبار است
 * This file contains various examples for using the News API
 */

/**
 * کلاس کلاینت برای دسترسی به API اخبار
 * Client class for accessing the News API
 */
class CryptoNewsClient {
  /**
   * @param {string} baseUrl - آدرس پایه سرور / Base URL of the server
   */
  constructor(baseUrl = window.location.origin) {
    this.baseUrl = baseUrl;
  }

  /**
   * دریافت تمام اخبار
   * Get all news articles
   * 
   * @param {number} limit - تعداد نتایج / Number of results
   * @returns {Promise<Array>} آرایه مقالات / Array of articles
   * 
   * @example
   * const client = new CryptoNewsClient();
   * const articles = await client.getAllNews(50);
   * console.log(`Found ${articles.length} articles`);
   */
  async getAllNews(limit = 100) {
    try {
      const url = `${this.baseUrl}/api/news?limit=${limit}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.articles || [];
    } catch (error) {
      console.error('خطا در دریافت اخبار / Error fetching news:', error);
      return [];
    }
  }

  /**
   * دریافت اخبار بر اساس احساسات
   * Get news by sentiment
   * 
   * @param {string} sentiment - 'positive', 'negative', or 'neutral'
   * @param {number} limit - تعداد نتایج / Number of results
   * @returns {Promise<Array>}
   * 
   * @example
   * const client = new CryptoNewsClient();
   * const positiveNews = await client.getNewsBySentiment('positive');
   * positiveNews.forEach(article => console.log(article.title));
   */
  async getNewsBySentiment(sentiment, limit = 50) {
    try {
      const url = `${this.baseUrl}/api/news?sentiment=${sentiment}&limit=${limit}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      const articles = data.articles || [];
      
      // فیلتر سمت کلاینت / Client-side filter
      return articles.filter(a => a.sentiment === sentiment);
    } catch (error) {
      console.error('Error:', error);
      return [];
    }
  }

  /**
   * دریافت اخبار از یک منبع خاص
   * Get news from a specific source
   * 
   * @param {string} source - نام منبع / Source name
   * @param {number} limit - تعداد نتایج / Number of results
   * @returns {Promise<Array>}
   * 
   * @example
   * const client = new CryptoNewsClient();
   * const coinDeskNews = await client.getNewsBySource('CoinDesk');
   */
  async getNewsBySource(source, limit = 50) {
    try {
      const url = `${this.baseUrl}/api/news?source=${encodeURIComponent(source)}&limit=${limit}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      return data.articles || [];
    } catch (error) {
      console.error('Error:', error);
      return [];
    }
  }

  /**
   * جستجوی اخبار بر اساس کلمه کلیدی
   * Search news by keyword
   * 
   * @param {string} keyword - کلمه کلیدی / Keyword
   * @param {number} limit - تعداد نتایج / Number of results
   * @returns {Promise<Array>}
   * 
   * @example
   * const client = new CryptoNewsClient();
   * const bitcoinNews = await client.searchNews('bitcoin');
   * console.log(`Found ${bitcoinNews.length} articles about Bitcoin`);
   */
  async searchNews(keyword, limit = 100) {
    const articles = await this.getAllNews(limit);
    const keywordLower = keyword.toLowerCase();
    
    return articles.filter(article => {
      const title = (article.title || '').toLowerCase();
      const content = (article.content || '').toLowerCase();
      return title.includes(keywordLower) || content.includes(keywordLower);
    });
  }

  /**
   * دریافت آخرین اخبار
   * Get latest news
   * 
   * @param {number} count - تعداد نتایج / Number of results
   * @returns {Promise<Array>}
   * 
   * @example
   * const client = new CryptoNewsClient();
   * const latest = await client.getLatestNews(5);
   * latest.forEach(article => {
   *   console.log(`${article.title} - ${article.published_at}`);
   * });
   */
  async getLatestNews(count = 10) {
    const articles = await this.getAllNews(100);
    
    // مرتب‌سازی بر اساس تاریخ انتشار / Sort by publish date
    const sorted = articles.sort((a, b) => {
      const dateA = new Date(a.published_at || 0);
      const dateB = new Date(b.published_at || 0);
      return dateB - dateA;
    });
    
    return sorted.slice(0, count);
  }

  /**
   * دریافت آمار اخبار
   * Get news statistics
   * 
   * @returns {Promise<Object>} آمار / Statistics
   * 
   * @example
   * const client = new CryptoNewsClient();
   * const stats = await client.getNewsStatistics();
   * console.log(`Total: ${stats.total}`);
   * console.log(`Positive: ${stats.positive}`);
   */
  async getNewsStatistics() {
    const articles = await this.getAllNews();
    
    const stats = {
      total: articles.length,
      positive: articles.filter(a => a.sentiment === 'positive').length,
      negative: articles.filter(a => a.sentiment === 'negative').length,
      neutral: articles.filter(a => a.sentiment === 'neutral').length,
      sources: new Set(articles.map(a => a.source?.title || '')).size
    };
    
    return stats;
  }
}

// ==============================================================================
// مثال‌های استفاده / Usage Examples
// ==============================================================================

/**
 * مثال ۱: استفاده ساده / Example 1: Basic Usage
 */
async function example1BasicUsage() {
  console.log('='.repeat(60));
  console.log('مثال ۱: دریافت تمام اخبار / Example 1: Get All News');
  console.log('='.repeat(60));
  
  const client = new CryptoNewsClient();
  const articles = await client.getAllNews(10);
  
  console.log(`\nتعداد مقالات / Number of articles: ${articles.length}\n`);
  
  articles.slice(0, 5).forEach((article, i) => {
    console.log(`${i + 1}. ${article.title || 'No title'}`);
    console.log(`   منبع / Source: ${article.source?.title || 'Unknown'}`);
    console.log(`   احساسات / Sentiment: ${article.sentiment || 'neutral'}`);
    console.log('');
  });
}

/**
 * مثال ۲: فیلتر بر اساس احساسات / Example 2: Sentiment Filtering
 */
async function example2SentimentFiltering() {
  console.log('='.repeat(60));
  console.log('مثال ۲: فیلتر اخبار مثبت / Example 2: Positive News Filter');
  console.log('='.repeat(60));
  
  const client = new CryptoNewsClient();
  const positiveNews = await client.getNewsBySentiment('positive', 50);
  
  console.log(`\nاخبار مثبت / Positive news: ${positiveNews.length}\n`);
  
  positiveNews.slice(0, 3).forEach(article => {
    console.log(`✓ ${article.title || 'No title'}`);
    console.log(`  ${(article.content || '').substring(0, 100)}...`);
    console.log('');
  });
}

/**
 * مثال ۳: جستجو با کلمه کلیدی / Example 3: Keyword Search
 */
async function example3KeywordSearch() {
  console.log('='.repeat(60));
  console.log('مثال ۳: جستجوی بیت‌کوین / Example 3: Bitcoin Search');
  console.log('='.repeat(60));
  
  const client = new CryptoNewsClient();
  const bitcoinNews = await client.searchNews('bitcoin');
  
  console.log(`\nمقالات مرتبط با بیت‌کوین / Bitcoin articles: ${bitcoinNews.length}\n`);
  
  bitcoinNews.slice(0, 5).forEach(article => {
    console.log(`• ${article.title || 'No title'}`);
  });
}

/**
 * مثال ۴: آمار اخبار / Example 4: News Statistics
 */
async function example4Statistics() {
  console.log('='.repeat(60));
  console.log('مثال ۴: آمار اخبار / Example 4: Statistics');
  console.log('='.repeat(60));
  
  const client = new CryptoNewsClient();
  const stats = await client.getNewsStatistics();
  
  console.log('\n📊 آمار / Statistics:');
  console.log(`   مجموع مقالات / Total: ${stats.total}`);
  console.log(`   مثبت / Positive: ${stats.positive} (${(stats.positive/stats.total*100).toFixed(1)}%)`);
  console.log(`   منفی / Negative: ${stats.negative} (${(stats.negative/stats.total*100).toFixed(1)}%)`);
  console.log(`   خنثی / Neutral: ${stats.neutral} (${(stats.neutral/stats.total*100).toFixed(1)}%)`);
  console.log(`   منابع / Sources: ${stats.sources}`);
}

/**
 * مثال ۵: آخرین اخبار / Example 5: Latest News
 */
async function example5LatestNews() {
  console.log('='.repeat(60));
  console.log('مثال ۵: آخرین اخبار / Example 5: Latest News');
  console.log('='.repeat(60));
  
  const client = new CryptoNewsClient();
  const latest = await client.getLatestNews(5);
  
  console.log('\n🕒 آخرین اخبار / Latest news:\n');
  
  latest.forEach((article, i) => {
    const published = article.published_at || '';
    const timeStr = published ? new Date(published).toLocaleString() : 'Unknown time';
    
    console.log(`${i + 1}. ${article.title || 'No title'}`);
    console.log(`   زمان / Time: ${timeStr}`);
    console.log('');
  });
}

/**
 * مثال ۶: فیلتر پیشرفته / Example 6: Advanced Filtering
 */
async function example6AdvancedFiltering() {
  console.log('='.repeat(60));
  console.log('مثال ۶: فیلتر ترکیبی / Example 6: Combined Filters');
  console.log('='.repeat(60));
  
  const client = new CryptoNewsClient();
  
  // دریافت اخبار مثبت درباره اتریوم
  // Get positive news about Ethereum
  const allNews = await client.getAllNews(100);
  
  const filtered = allNews.filter(article => {
    const isPositive = article.sentiment === 'positive';
    const isEthereum = (article.title || '').toLowerCase().includes('ethereum');
    return isPositive && isEthereum;
  });
  
  console.log(`\nاخبار مثبت درباره اتریوم / Positive Ethereum news: ${filtered.length}\n`);
  
  filtered.slice(0, 3).forEach(article => {
    console.log(`✓ ${article.title || 'No title'}`);
    console.log(`  منبع / Source: ${article.source?.title || 'Unknown'}`);
    console.log('');
  });
}

/**
 * تابع اصلی / Main function
 */
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('نمونه‌های استفاده از API اخبار کریپتو');
  console.log('Crypto News API Usage Examples');
  console.log('='.repeat(60) + '\n');
  
  try {
    // اجرای تمام مثال‌ها / Run all examples
    await example1BasicUsage();
    console.log('\n');
    
    await example2SentimentFiltering();
    console.log('\n');
    
    await example3KeywordSearch();
    console.log('\n');
    
    await example4Statistics();
    console.log('\n');
    
    await example5LatestNews();
    console.log('\n');
    
    await example6AdvancedFiltering();
    
  } catch (error) {
    console.error('\nخطا / Error:', error.message);
    console.error('لطفاً مطمئن شوید که سرور در حال اجرا است');
    console.error('Please make sure the server is running');
  }
}

// اجرای برنامه اگر به صورت مستقیم فراخوانی شود
// Run the program if executed directly
if (typeof window === 'undefined') {
  // Node.js environment
  main();
} else {
  // Browser environment - export for use
  window.CryptoNewsClient = CryptoNewsClient;
  console.log('CryptoNewsClient class is now available globally');
  console.log('Usage: const client = new CryptoNewsClient();');
}

// Export for ES6 modules
export { CryptoNewsClient };
export default CryptoNewsClient;




















