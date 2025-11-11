/**
 * CORS Proxy Service - Handle CORS issues with multiple fallback proxies
 */

import { Logger } from '../core/Logger.js';

const CORS_PROXIES = [
  'https://api.allorigins.win/get?url=',
  'https://proxy.cors.sh/',
  'https://proxy.corsfix.com/?url=',
  'https://api.codetabs.com/v1/proxy?quest=',
  'https://thingproxy.freeboard.io/fetch/',
  'https://crossorigin.me/'
];

export class CORSProxyService {
  private static instance: CORSProxyService;
  private logger = Logger.getInstance();
  private proxyIndex = 0;

  private constructor() {}

  static getInstance(): CORSProxyService {
    if (!CORSProxyService.instance) {
      CORSProxyService.instance = new CORSProxyService();
    }
    return CORSProxyService.instance;
  }

  async fetchWithProxy(url: string, options?: RequestInit): Promise<any> {
    // Try direct fetch first
    try {
      const response = await fetch(url, { ...options, signal: AbortSignal.timeout(10000) });
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      this.logger.debug('Direct fetch failed, trying proxies', { url });
    }

    // Try each proxy
    for (let i = 0; i < CORS_PROXIES.length; i++) {
      const proxy = CORS_PROXIES[(this.proxyIndex + i) % CORS_PROXIES.length];
      
      try {
        const proxyUrl = proxy + encodeURIComponent(url);
        const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(15000) });
        
        if (response.ok) {
          const data = await response.json();
          
          // Handle different proxy response formats
          if (data.contents) {
            // allorigins format
            return JSON.parse(data.contents);
          } else if (data.data) {
            return data.data;
          } else {
            return data;
          }
        }
      } catch (error) {
        this.logger.debug(`Proxy ${proxy} failed`, { url, error: (error as Error).message });
        continue;
      }
    }

    console.error(`All CORS proxies failed for ${url}`);
  }

  async fetchText(url: string): Promise<string> {
    // Try direct fetch first
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (response.ok) {
        return await response.text();
      }
    } catch (error) {
      this.logger.debug('Direct text fetch failed, trying proxies', { url });
    }

    // Try each proxy
    for (const proxy of CORS_PROXIES) {
      try {
        const proxyUrl = proxy + encodeURIComponent(url);
        const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(15000) });
        
        if (response.ok) {
          const data = await response.json();
          return data.contents || data.data || JSON.stringify(data);
        }
      } catch (error) {
        continue;
      }
    }

    console.error(`All CORS proxies failed for ${url}`);
  }
}
