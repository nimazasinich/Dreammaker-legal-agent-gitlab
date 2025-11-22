/**
 * Optional NewsAPI Service
 * Requires NEWS_API_KEY environment variable
 * This is an OPTIONAL alternative provider for news
 */
import axios from "axios";

const BASE_URL = "https://newsapi.org/v2/everything";
const API_KEY = process.env.NEWS_API_KEY || "";

export type NewsArticle = {
  title?: string;
  description?: string;
  url?: string;
  source?: { name?: string };
  publishedAt?: string;
};

export class NewsApiService {
  /**
   * Ensure API key is present
   * Returns true if key is valid, false otherwise
   */
  static assertKey(): boolean {
    if (!API_KEY || API_KEY === '') {
      console.error("INVALID_NEWS_API_KEY", "NEWS_API_KEY is missing or empty in environment variables");
      return false;
    }
    return true;
  }

  /**
   * Search for news articles
   */
  static async search(
    query: string,
    pageSize = 50,
    language = "en"
  ): Promise<NewsArticle[]> {
    // Validate API key first
    if (!this.assertKey()) {
      console.error("NEWS_API_DISABLED", "NewsAPI service disabled due to missing/invalid API key");
      return []; // Return empty array instead of failing
    }

    try {
      const response = await axios.get(BASE_URL, {
        params: {
          q: query,
          language,
          sortBy: "publishedAt",
          pageSize,
          apiKey: API_KEY
        },
        timeout: 15000,
        validateStatus: () => true
      });

      // Handle various error states with structured logging
      if (response.status === 401 || response.status === 403) {
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          component: "NewsApiService",
          severity: "ERROR",
          code: "INVALID_NEWS_API_KEY",
          message: "NewsAPI authentication failed - invalid API key",
          metadata: { statusCode: response.status }
        }));
        return [];
      }

      if (response.status === 429) {
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          component: "NewsApiService",
          severity: "ERROR",
          code: "NEWS_API_FAIL:newsapi",
          message: "NewsAPI rate limit exceeded",
          metadata: { statusCode: 429 }
        }));
        return [];
      }

      if (response.status === 500 || response.status === 502 || response.status === 503) {
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          component: "NewsApiService",
          severity: "ERROR",
          code: "NEWS_API_FAIL:newsapi",
          message: `NewsAPI server error: ${response.status}`,
          metadata: { statusCode: response.status }
        }));
        return [];
      }

      if (response.status !== 200) {
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          component: "NewsApiService",
          severity: "ERROR",
          code: "NEWS_API_FAIL:newsapi",
          message: `NewsAPI error ${response.status}: ${response.data?.message || "unknown error"}`,
          metadata: { statusCode: response.status, details: response.data?.message }
        }));
        return [];
      }

      if (response.data?.status !== "ok") {
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          component: "NewsApiService",
          severity: "ERROR",
          code: "NEWS_API_FAIL:newsapi",
          message: `NewsAPI returned non-ok status: ${response.data?.message || "unknown error"}`,
          metadata: { status: response.data?.status, details: response.data?.message }
        }));
        return [];
      }

      // Validate response structure
      if (!response.data.articles || !Array.isArray(response.data.articles)) {
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          component: "NewsApiService",
          severity: "ERROR",
          code: "NEWS_API_FAIL:newsapi",
          message: "NewsAPI returned invalid response format",
          metadata: { hasArticles: !!response.data.articles, isArray: Array.isArray(response.data.articles) }
        }));
        return [];
      }

      return response.data.articles as NewsArticle[];
    } catch (error: any) {
      // Handle network errors with structured logging
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          component: "NewsApiService",
          severity: "ERROR",
          code: "NEWS_API_FAIL:newsapi",
          message: "NewsAPI request timeout",
          metadata: { errorCode: error.code }
        }));
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          component: "NewsApiService",
          severity: "ERROR",
          code: "NEWS_API_FAIL:newsapi",
          message: "NewsAPI service unreachable",
          metadata: { errorCode: error.code }
        }));
      } else {
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          component: "NewsApiService",
          severity: "ERROR",
          code: "NEWS_API_FAIL:newsapi",
          message: error.message || "Unknown NewsAPI error",
          metadata: { error: error.toString() }
        }));
      }
      return []; // Always return empty array on error, never undefined/null
    }
  }
}
