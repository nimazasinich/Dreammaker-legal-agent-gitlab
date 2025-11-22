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

      // Handle various error states
      if (response.status === 401 || response.status === 403) {
        console.error("INVALID_NEWS_API_KEY", "NewsAPI authentication failed - invalid API key");
        return [];
      }

      if (response.status === 429) {
        console.error("NEWS_API_RATE_LIMIT", "NewsAPI rate limit exceeded");
        return [];
      }

      if (response.status === 500 || response.status === 502 || response.status === 503) {
        console.error("NEWS_API_SERVER_ERROR", `NewsAPI server error: ${response.status}`);
        return [];
      }

      if (response.status !== 200) {
        console.error(
          "NEWS_API_HTTP_ERROR",
          `NewsAPI error ${response.status}: ${response.data?.message || "unknown error"}`
        );
        return [];
      }

      if (response.data?.status !== "ok") {
        console.error(
          "NEWS_API_FAIL",
          `NewsAPI returned non-ok status: ${response.data?.message || "unknown error"}`
        );
        return [];
      }

      // Validate response structure
      if (!response.data.articles || !Array.isArray(response.data.articles)) {
        console.error("NEWS_API_INVALID_RESPONSE", "NewsAPI returned invalid response format");
        return [];
      }

      return response.data.articles as NewsArticle[];
    } catch (error: any) {
      // Handle network errors
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        console.error("NEWS_API_TIMEOUT", "NewsAPI request timeout");
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        console.error("NEWS_API_UNREACHABLE", "NewsAPI service unreachable");
      } else {
        console.error("NEWS_API_ERROR", error.message || "Unknown NewsAPI error");
      }
      return []; // Always return empty array on error, never undefined/null
    }
  }
}
