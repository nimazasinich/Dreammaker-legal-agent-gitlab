/**
 * Optional Binance Public Service
 * Keyless public API access to Binance
 * This is an OPTIONAL alternative provider - does not replace existing BinanceService
 */
import axios from "axios";

const BinanceClient = axios.create({
  baseURL: "https://api.binance.com",
  timeout: 15000
});

export class BinancePublicService {
  /**
   * Get current price for a symbol
   */
  static async price(symbol: string) {
    const response = await BinanceClient.get("/api/v3/ticker/price", {
      params: { symbol }
    });

    if (response.status !== 200 || !response.data?.price) {
      console.error("Binance price failed");
    }

    return {
      symbol,
      price: Number(response.data.price)
    };
  }

  /**
   * Get klines/candlestick data
   */
  static async klines(symbol: string, interval = "1h", limit = 500) {
    const response = await BinanceClient.get("/api/v3/klines", {
      params: { symbol, interval, limit }
    });

    if (response.status !== 200 || !Array.isArray(response.data)) {
      console.error("Binance klines failed");
    }

    return response.data; // [openTime, open, high, low, close, volume, ...]
  }

  /**
   * Get exchange info
   */
  static async exchangeInfo() {
    const response = await BinanceClient.get("/api/v3/exchangeInfo");

    if (response.status !== 200) {
      console.error("Binance exchangeInfo failed");
    }

    return response.data;
  }
}
