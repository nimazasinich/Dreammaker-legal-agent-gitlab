"""
نمونه کدهای استفاده از API اخبار کریپتو
Crypto News API Client Examples in Python

این فایل شامل مثال‌های مختلف برای استفاده از API اخبار است
This file contains various examples for using the News API
"""

import requests
import json
from typing import List, Dict, Optional
from datetime import datetime


class CryptoNewsClient:
    """
    کلاس کلاینت برای دسترسی به API اخبار
    Client class for accessing the News API
    """
    
    def __init__(self, base_url: str = "http://localhost:3000"):
        """
        مقداردهی اولیه کلاینت
        Initialize the client
        
        Args:
            base_url: آدرس پایه سرور / Base URL of the server
        """
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'Accept': 'application/json',
            'User-Agent': 'CryptoNewsClient/1.0'
        })
    
    def get_all_news(self, limit: int = 100) -> List[Dict]:
        """
        دریافت تمام اخبار
        Get all news articles
        
        Example:
            >>> client = CryptoNewsClient()
            >>> articles = client.get_all_news(limit=50)
            >>> print(f"Found {len(articles)} articles")
        """
        url = f"{self.base_url}/api/news"
        params = {'limit': limit}
        
        try:
            response = self.session.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            return data.get('articles', [])
        except requests.exceptions.RequestException as e:
            print(f"خطا در دریافت اخبار / Error fetching news: {e}")
            return []
    
    def get_news_by_sentiment(self, sentiment: str, limit: int = 50) -> List[Dict]:
        """
        دریافت اخبار بر اساس احساسات
        Get news by sentiment
        
        Args:
            sentiment: 'positive', 'negative', or 'neutral'
            limit: تعداد نتایج / Number of results
        
        Example:
            >>> client = CryptoNewsClient()
            >>> positive_news = client.get_news_by_sentiment('positive')
            >>> for article in positive_news[:5]:
            ...     print(article['title'])
        """
        url = f"{self.base_url}/api/news"
        params = {
            'sentiment': sentiment,
            'limit': limit
        }
        
        try:
            response = self.session.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            articles = data.get('articles', [])
            
            # فیلتر سمت کلاینت / Client-side filter
            return [a for a in articles if a.get('sentiment') == sentiment]
        except requests.exceptions.RequestException as e:
            print(f"Error: {e}")
            return []
    
    def get_news_by_source(self, source: str, limit: int = 50) -> List[Dict]:
        """
        دریافت اخبار از یک منبع خاص
        Get news from a specific source
        
        Example:
            >>> client = CryptoNewsClient()
            >>> coindesk_news = client.get_news_by_source('CoinDesk')
        """
        url = f"{self.base_url}/api/news"
        params = {
            'source': source,
            'limit': limit
        }
        
        try:
            response = self.session.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            return data.get('articles', [])
        except requests.exceptions.RequestException as e:
            print(f"Error: {e}")
            return []
    
    def search_news(self, keyword: str, limit: int = 100) -> List[Dict]:
        """
        جستجوی اخبار بر اساس کلمه کلیدی
        Search news by keyword
        
        Example:
            >>> client = CryptoNewsClient()
            >>> bitcoin_news = client.search_news('bitcoin')
            >>> print(f"Found {len(bitcoin_news)} articles about Bitcoin")
        """
        articles = self.get_all_news(limit)
        keyword_lower = keyword.lower()
        
        return [
            article for article in articles
            if keyword_lower in article.get('title', '').lower() or
               keyword_lower in article.get('content', '').lower()
        ]
    
    def get_latest_news(self, count: int = 10) -> List[Dict]:
        """
        دریافت آخرین اخبار
        Get latest news
        
        Example:
            >>> client = CryptoNewsClient()
            >>> latest = client.get_latest_news(5)
            >>> for article in latest:
            ...     print(f"{article['title']} - {article['published_at']}")
        """
        articles = self.get_all_news(limit=100)
        
        # مرتب‌سازی بر اساس تاریخ انتشار / Sort by publish date
        sorted_articles = sorted(
            articles,
            key=lambda x: x.get('published_at', ''),
            reverse=True
        )
        
        return sorted_articles[:count]
    
    def get_news_statistics(self) -> Dict:
        """
        دریافت آمار اخبار
        Get news statistics
        
        Returns:
            Dictionary containing statistics
        
        Example:
            >>> client = CryptoNewsClient()
            >>> stats = client.get_news_statistics()
            >>> print(f"Total articles: {stats['total']}")
            >>> print(f"Positive: {stats['positive']}")
            >>> print(f"Negative: {stats['negative']}")
        """
        articles = self.get_all_news()
        
        stats = {
            'total': len(articles),
            'positive': sum(1 for a in articles if a.get('sentiment') == 'positive'),
            'negative': sum(1 for a in articles if a.get('sentiment') == 'negative'),
            'neutral': sum(1 for a in articles if a.get('sentiment') == 'neutral'),
            'sources': len(set(a.get('source', {}).get('title', '') for a in articles))
        }
        
        return stats


# ==============================================================================
# مثال‌های استفاده / Usage Examples
# ==============================================================================

def example_1_basic_usage():
    """مثال ۱: استفاده ساده / Example 1: Basic Usage"""
    print("=" * 60)
    print("مثال ۱: دریافت تمام اخبار / Example 1: Get All News")
    print("=" * 60)
    
    client = CryptoNewsClient()
    articles = client.get_all_news(limit=10)
    
    print(f"\nتعداد مقالات / Number of articles: {len(articles)}\n")
    
    for i, article in enumerate(articles[:5], 1):
        print(f"{i}. {article.get('title', 'No title')}")
        print(f"   منبع / Source: {article.get('source', {}).get('title', 'Unknown')}")
        print(f"   احساسات / Sentiment: {article.get('sentiment', 'neutral')}")
        print()


def example_2_sentiment_filtering():
    """مثال ۲: فیلتر بر اساس احساسات / Example 2: Sentiment Filtering"""
    print("=" * 60)
    print("مثال ۲: فیلتر اخبار مثبت / Example 2: Positive News Filter")
    print("=" * 60)
    
    client = CryptoNewsClient()
    positive_news = client.get_news_by_sentiment('positive', limit=50)
    
    print(f"\nاخبار مثبت / Positive news: {len(positive_news)}\n")
    
    for article in positive_news[:3]:
        print(f"✓ {article.get('title', 'No title')}")
        print(f"  {article.get('content', '')[:100]}...")
        print()


def example_3_keyword_search():
    """مثال ۳: جستجو با کلمه کلیدی / Example 3: Keyword Search"""
    print("=" * 60)
    print("مثال ۳: جستجوی بیت‌کوین / Example 3: Bitcoin Search")
    print("=" * 60)
    
    client = CryptoNewsClient()
    bitcoin_news = client.search_news('bitcoin')
    
    print(f"\nمقالات مرتبط با بیت‌کوین / Bitcoin articles: {len(bitcoin_news)}\n")
    
    for article in bitcoin_news[:5]:
        print(f"• {article.get('title', 'No title')}")


def example_4_statistics():
    """مثال ۴: آمار اخبار / Example 4: News Statistics"""
    print("=" * 60)
    print("مثال ۴: آمار اخبار / Example 4: Statistics")
    print("=" * 60)
    
    client = CryptoNewsClient()
    stats = client.get_news_statistics()
    
    print("\n📊 آمار / Statistics:")
    print(f"   مجموع مقالات / Total: {stats['total']}")
    print(f"   مثبت / Positive: {stats['positive']} ({stats['positive']/stats['total']*100:.1f}%)")
    print(f"   منفی / Negative: {stats['negative']} ({stats['negative']/stats['total']*100:.1f}%)")
    print(f"   خنثی / Neutral: {stats['neutral']} ({stats['neutral']/stats['total']*100:.1f}%)")
    print(f"   منابع / Sources: {stats['sources']}")


def example_5_latest_news():
    """مثال ۵: آخرین اخبار / Example 5: Latest News"""
    print("=" * 60)
    print("مثال ۵: آخرین اخبار / Example 5: Latest News")
    print("=" * 60)
    
    client = CryptoNewsClient()
    latest = client.get_latest_news(5)
    
    print("\n🕒 آخرین اخبار / Latest news:\n")
    
    for i, article in enumerate(latest, 1):
        published = article.get('published_at', '')
        if published:
            dt = datetime.fromisoformat(published.replace('Z', '+00:00'))
            time_str = dt.strftime('%Y-%m-%d %H:%M')
        else:
            time_str = 'Unknown time'
        
        print(f"{i}. {article.get('title', 'No title')}")
        print(f"   زمان / Time: {time_str}")
        print()


def example_6_advanced_filtering():
    """مثال ۶: فیلتر پیشرفته / Example 6: Advanced Filtering"""
    print("=" * 60)
    print("مثال ۶: فیلتر ترکیبی / Example 6: Combined Filters")
    print("=" * 60)
    
    client = CryptoNewsClient()
    
    # دریافت اخبار مثبت درباره اتریوم
    # Get positive news about Ethereum
    all_news = client.get_all_news(limit=100)
    
    filtered = [
        article for article in all_news
        if article.get('sentiment') == 'positive' and
           'ethereum' in article.get('title', '').lower()
    ]
    
    print(f"\nاخبار مثبت درباره اتریوم / Positive Ethereum news: {len(filtered)}\n")
    
    for article in filtered[:3]:
        print(f"✓ {article.get('title', 'No title')}")
        print(f"  منبع / Source: {article.get('source', {}).get('title', 'Unknown')}")
        print()


def main():
    """تابع اصلی / Main function"""
    print("\n" + "=" * 60)
    print("نمونه‌های استفاده از API اخبار کریپتو")
    print("Crypto News API Usage Examples")
    print("=" * 60 + "\n")
    
    try:
        # اجرای تمام مثال‌ها / Run all examples
        example_1_basic_usage()
        print("\n")
        
        example_2_sentiment_filtering()
        print("\n")
        
        example_3_keyword_search()
        print("\n")
        
        example_4_statistics()
        print("\n")
        
        example_5_latest_news()
        print("\n")
        
        example_6_advanced_filtering()
        
    except Exception as e:
        print(f"\nخطا / Error: {e}")
        print("لطفاً مطمئن شوید که سرور در حال اجرا است")
        print("Please make sure the server is running")


if __name__ == "__main__":
    main()



































