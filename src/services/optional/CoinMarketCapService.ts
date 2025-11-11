/**
 * Optional CoinMarketCap Service
 * Requires CMC_API_KEY environment variable
 * This is an OPTIONAL alternative provider for market data
 */
import axios from "axios";

const CMCClient = axios.create({
  baseURL: "https://pro-api.coinmarketcap.com",
  timeout: 15000
});

const API_KEY = process.env.CMC_API_KEY || "";

function assertKey() {
  if (!API_KEY) {
    console.error("CMC_API_KEY is missing in environment variables");
  }
}

export class CoinMarketCapService {
  /**
   * Get latest cryptocurrency listings
   */
  static async listings(limit = 10, convert = "USD") {
    assertKey();

    const response = await CMCClient.get("/v1/cryptocurrency/listings/latest", {
      headers: {
        "X-CMC_PRO_API_KEY": API_KEY,
        "Accept": "application/json"
      },
      params: { limit, convert },
      validateStatus: () => true
    });

    if (response.status !== 200 || !response.data?.data) {
      console.error(
        `CMC listings failed ${response.status}: ${
          response.data?.status?.error_message || response.statusText
        }`
      );
    }

    return response.data.data;
  }

  /**
   * Get quote for a specific cryptocurrency
   */
  static async quote(symbol = "BTC", convert = "USD") {
    assertKey();

    const response = await CMCClient.get("/v1/cryptocurrency/quotes/latest", {
      headers: {
        "X-CMC_PRO_API_KEY": API_KEY,
        "Accept": "application/json"
      },
      params: { symbol, convert },
      validateStatus: () => true
    });

    if (response.status !== 200 || !response.data?.data?.[symbol]) {
      console.error(
        `CMC quote failed ${response.status}: ${
          response.data?.status?.error_message || response.statusText
        }`
      );
    }

    return response.data.data[symbol];
  }

  /**
   * Get cryptocurrency info/metadata
   */
  static async info(symbol = "BTC") {
    assertKey();

    const response = await CMCClient.get("/v1/cryptocurrency/info", {
      headers: {
        "X-CMC_PRO_API_KEY": API_KEY,
        "Accept": "application/json"
      },
      params: { symbol },
      validateStatus: () => true
    });

    if (response.status !== 200 || !response.data?.data?.[symbol]) {
      console.error(
        `CMC info failed ${response.status}: ${
          response.data?.status?.error_message || response.statusText
        }`
      );
    }

    return response.data.data[symbol];
  }
}
