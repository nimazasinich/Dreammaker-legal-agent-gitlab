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
   */
  static assertKey() {
    if (!API_KEY) {
      console.error("NEWS_API_KEY is missing in environment variables");
    }
  }

  /**
   * Search for news articles
   */
  static async search(
    query: string,
    pageSize = 50,
    language = "en"
  ): Promise<NewsArticle[]> {
    this.assertKey();

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

    if (response.status !== 200 || response.data?.status !== "ok") {
      console.error(
        `NewsAPI error ${response.status}: ${response.data?.message || "unknown error"}`
      );
    }

    return (response.data.articles || []) as NewsArticle[];
  }
}
