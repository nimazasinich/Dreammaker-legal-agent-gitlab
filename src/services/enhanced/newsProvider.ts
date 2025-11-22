import { API_BASE } from '../../config/env';

export type NewsArticle = {
  id: string;
  title: string;
  description?: string;
  url: string;
  image?: string;
  source?: string;
  published?: string; // ISO
};

type NewsApiResponse = {
  data?: { status?: string; totalResults?: number; articles?: Array<any>; };
  source?: string;
  cached?: boolean;
};

export async function fetchNews(query = 'cryptocurrency OR bitcoin OR ethereum', pageSize = 24): Promise<NewsArticle[]> {
  try {
    const url = `${API_BASE}/proxy/news?query=${encodeURIComponent(query)}&page_size=${pageSize}`;
    
    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    const res = await fetch(url, { 
      credentials: 'include',
      signal: controller.signal 
    });
    
    clearTimeout(timeoutId);
    
    // Handle various error states
    if (res.status === 401 || res.status === 403) {
      console.error('NEWS_API_UNAUTHORIZED', `Authentication failed: ${res.status}`);
      return [];
    }
    
    if (res.status === 429) {
      console.error('NEWS_API_RATE_LIMIT', 'Rate limit exceeded');
      return [];
    }
    
    if (res.status === 404) {
      console.error('NEWS_API_NOT_FOUND', 'News endpoint not found - may be deprecated');
      return [];
    }
    
    if (res.status >= 500) {
      console.error('NEWS_API_SERVER_ERROR', `Server error: ${res.status}`);
      return [];
    }
    
    if (!res.ok) {
      console.error('NEWS_API_HTTP_ERROR', `HTTP error: ${res.status}`);
      return [];
    }
    
    const json: NewsApiResponse = await res.json();
    
    // Validate response structure
    if (!json || typeof json !== 'object') {
      console.error('NEWS_API_INVALID_RESPONSE', 'Invalid JSON response');
      return [];
    }
    
    const arts = json?.data?.articles ?? [];
    
    if (!Array.isArray(arts)) {
      console.error('NEWS_API_INVALID_DATA', 'Articles data is not an array');
      return [];
    }
    
    // Map and validate each article
    return arts.map((a: any, idx: number) => ({
      id: `${a.url || 'unknown'}-${idx}`,
      title: a.title || 'Untitled',
      description: a.description || '',
      url: a.url || '#',
      image: a.urlToImage || undefined,
      source: a.source?.name ?? json.source ?? 'newsapi',
      published: a.publishedAt || new Date().toISOString()
    })).filter(article => article.url !== '#'); // Filter out invalid articles
  } catch (error: any) {
    // Structured error handling
    if (error.name === 'AbortError') {
      console.error('NEWS_API_TIMEOUT', 'Request timeout after 10s');
    } else if (error.message?.includes('fetch')) {
      console.error('NEWS_API_NETWORK_ERROR', error.message);
    } else {
      console.error('NEWS_API_ERROR', error.message || 'Unknown error');
    }
    return []; // Always return empty array, never undefined/null
  }
}

export type FearGreed = { value: string; value_classification: string; timestamp: string };
export async function fetchFearGreed(): Promise<FearGreed | null> {
  try {
    // Add timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
    
    const res = await fetch(`${API_BASE}/proxy/fear-greed`, { 
      credentials: 'include',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    // Handle error states
    if (res.status === 404) {
      console.error('FEAR_GREED_NOT_FOUND', 'Fear & Greed endpoint not found');
      return null;
    }
    
    if (res.status === 429) {
      console.error('FEAR_GREED_RATE_LIMIT', 'Rate limit exceeded');
      return null;
    }
    
    if (!res.ok) {
      console.error('FEAR_GREED_HTTP_ERROR', `HTTP error: ${res.status}`);
      return null;
    }
    
    const json = await res.json();
    
    // Validate response structure
    if (!json || typeof json !== 'object') {
      console.error('FEAR_GREED_INVALID_RESPONSE', 'Invalid JSON response');
      return null;
    }
    
    const fg = json?.data?.data?.[0];
    
    if (!fg) {
      console.error('FEAR_GREED_NO_DATA', 'No fear & greed data available');
      return null;
    }
    
    // Validate data structure
    if (!fg.value || !fg.value_classification) {
      console.error('FEAR_GREED_INVALID_DATA', 'Invalid fear & greed data structure');
      return null;
    }
    
    return fg;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('FEAR_GREED_TIMEOUT', 'Request timeout');
    } else {
      console.error('FEAR_GREED_ERROR', error.message || 'Unknown error');
    }
    return null; // Always return null on error, not undefined
  }
}
