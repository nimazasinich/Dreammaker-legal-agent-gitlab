/**
 * Optional Kraken Public Service
 * Keyless public API access to Kraken
 * This is an OPTIONAL alternative provider
 */
import axios from "axios";

const KrakenClient = axios.create({
  baseURL: "https://api.kraken.com",
  timeout: 15000
});

export class KrakenPublicService {
  /**
   * Get ticker information for a trading pair
   */
  static async ticker(pair = "XBTUSD") {
    const response = await KrakenClient.get("/0/public/Ticker", {
      params: { pair }
    });

    if (response.status !== 200 || !response.data?.result) {
      console.error("Kraken ticker failed");
    }

    return response.data.result;
  }

  /**
   * Get OHLC data
   */
  static async ohlc(pair = "XBTUSD", interval = 60) {
    const response = await KrakenClient.get("/0/public/OHLC", {
      params: { pair, interval }
    });

    if (response.status !== 200 || !response.data?.result) {
      console.error("Kraken OHLC failed");
    }

    return response.data.result;
  }
}
