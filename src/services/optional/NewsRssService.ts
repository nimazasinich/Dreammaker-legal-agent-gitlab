/**
 * Optional News RSS Service
 * Keyless news aggregation from RSS feeds
 * This is an OPTIONAL alternative provider for news
 */
import axios from "axios";
import { XMLParser } from "fast-xml-parser";

const RSS_FEEDS = [
  "https://www.coindesk.com/arc/outboundfeeds/rss/?outputType=xml",
  "https://cointelegraph.com/rss"
];

export class NewsRssService {
  /**
   * Fetch news from RSS feeds
   */
  static async fetch(limit = 50) {
    const parser = new XMLParser({ ignoreAttributes: false });
    const articles: { title?: string; link?: string; description?: string; source?: string }[] = [];

    for (const url of RSS_FEEDS) {
      try {
        const response = await axios.get(url, { timeout: 15000 });
        const parsed = parser.parse(response.data);

        // Handle RSS format
        const items = parsed?.rss?.channel?.item || parsed?.feed?.entry || [];
        const feedSource = url.includes('coindesk') ? 'CoinDesk' :
                          url.includes('cointelegraph') ? 'CoinTelegraph' : 'RSS';

        for (const item of items) {
          articles.push({
            title: item.title || item?.summary,
            link: item.link?.["@_href"] || item.link || item?.guid,
            description: item.description || item?.summary,
            source: feedSource
          });
        }
      } catch (error) {
        console.warn(`Failed to fetch RSS from ${url}:`, error);
      }
    }

    return articles.slice(0, limit);
  }
}
