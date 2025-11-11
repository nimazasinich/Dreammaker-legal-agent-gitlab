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
  const url = `${API_BASE}/proxy/news?query=${encodeURIComponent(query)}&page_size=${pageSize}`;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) console.error(`news ${res.status}`);
  const json: NewsApiResponse = await res.json();
  const arts = json?.data?.articles ?? [];
  return (arts || []).map((a:any, idx:number) => ({
    id: `${a.url}-${idx}`,
    title: a.title,
    description: a.description,
    url: a.url,
    image: a.urlToImage,
    source: a.source?.name ?? json.source ?? 'newsapi',
    published: a.publishedAt
  }));
}

export type FearGreed = { value: string; value_classification: string; timestamp: string };
export async function fetchFearGreed(): Promise<FearGreed | null> {
  try {
    const res = await fetch(`${API_BASE}/proxy/fear-greed`, { credentials: 'include' });
    if (!res.ok) return null;
    const json = await res.json();
    const fg = json?.data?.data?.[0];
    return fg || null;
  } catch { return null; }
}
