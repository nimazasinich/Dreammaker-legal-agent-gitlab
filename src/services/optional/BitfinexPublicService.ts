/**
 * Optional Bitfinex Public Service
 * Keyless public API access to Bitfinex
 * This is an OPTIONAL alternative provider
 */
import axios from "axios";

const BitfinexClient = axios.create({
  baseURL: "https://api-pub.bitfinex.com",
  timeout: 15000
});

export class BitfinexPublicService {
  /**
   * Get ticker data for a symbol
   */
  static async ticker(symbol = "tBTCUSD") {
    const response = await BitfinexClient.get(`/v2/ticker/${symbol}`);

    if (response.status !== 200 || !Array.isArray(response.data)) {
      console.error("Bitfinex ticker failed");
    }

    return response.data;
  }

  /**
   * Get candles data
   */
  static async candles(symbol = "tBTCUSD", timeframe = "1h", limit = 100) {
    const response = await BitfinexClient.get(`/v2/candles/trade:${timeframe}:${symbol}/hist`, {
      params: { limit }
    });

    if (response.status !== 200 || !Array.isArray(response.data)) {
      console.error("Bitfinex candles failed");
    }

    return response.data;
  }
}
