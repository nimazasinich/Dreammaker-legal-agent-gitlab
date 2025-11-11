/**
 * Optional CryptoCompare Service
 * CRYPTOCOMPARE_KEY is optional (works without key but with lower rate limits)
 * This is an OPTIONAL alternative provider for market data
 */
import axios from "axios";

const CCClient = axios.create({
  baseURL: "https://min-api.cryptocompare.com",
  timeout: 15000
});

const API_KEY = process.env.CRYPTOCOMPARE_KEY || "";

export class CryptoCompareService {
  /**
   * Get prices for multiple symbols
   */
  static async priceMulti(fsyms = "BTC,ETH", tsyms = "USD") {
    const response = await CCClient.get("/data/pricemulti", {
      params: {
        fsyms,
        tsyms,
        api_key: API_KEY || undefined
      },
      validateStatus: () => true
    });

    if (response.status !== 200 || !response.data) {
      console.error(`CryptoCompare priceMulti failed ${response.status}`);
    }

    return response.data;
  }

  /**
   * Get historical hourly data
   */
  static async histoHour(fsym = "BTC", tsym = "USD", limit = 168) {
    const response = await CCClient.get("/data/v2/histohour", {
      params: {
        fsym,
        tsym,
        limit,
        api_key: API_KEY || undefined
      },
      validateStatus: () => true
    });

    if (response.status !== 200 || !response.data?.Data?.Data) {
      console.error(`CryptoCompare histoHour failed ${response.status}`);
    }

    return response.data.Data.Data;
  }

  /**
   * Get historical daily data
   */
  static async histoDay(fsym = "BTC", tsym = "USD", limit = 30) {
    const response = await CCClient.get("/data/v2/histoday", {
      params: {
        fsym,
        tsym,
        limit,
        api_key: API_KEY || undefined
      },
      validateStatus: () => true
    });

    if (response.status !== 200 || !response.data?.Data?.Data) {
      console.error(`CryptoCompare histoDay failed ${response.status}`);
    }

    return response.data.Data.Data;
  }
}
