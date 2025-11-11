/**
 * Optional WhaleAlert Service
 * Requires WHALEALERT_KEY environment variable
 * This is an OPTIONAL provider for whale transaction tracking
 */
import axios from "axios";

const WhaleAlertClient = axios.create({
  baseURL: "https://api.whale-alert.io",
  timeout: 15000
});

const API_KEY = process.env.WHALEALERT_KEY || "";

export class WhaleAlertService {
  /**
   * Ensure API key is present
   */
  static assertKey() {
    if (!API_KEY) {
      console.error("WHALEALERT_KEY is missing in environment variables");
    }
  }

  /**
   * Get recent whale transactions
   */
  static async transactions(limit = 10, start?: number) {
    this.assertKey();

    const params: any = { api_key: API_KEY, limit };
    if (start) params.start = start;

    const response = await WhaleAlertClient.get("/v1/transactions", {
      params,
      validateStatus: () => true
    });

    if (response.status !== 200 || !response.data) {
      console.error(`WhaleAlert failed ${response.status}: ${response.statusText}`);
    }

    return response.data; // { count, transactions: [...] }
  }

  /**
   * Get transaction status
   */
  static async status() {
    this.assertKey();

    const response = await WhaleAlertClient.get("/v1/status", {
      params: { api_key: API_KEY },
      validateStatus: () => true
    });

    if (response.status !== 200) {
      console.error(`WhaleAlert status failed ${response.status}`);
    }

    return response.data;
  }
}
