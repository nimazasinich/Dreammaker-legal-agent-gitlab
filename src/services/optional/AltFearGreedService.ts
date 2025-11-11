/**
 * Optional Alternative.me Fear & Greed Service
 * Keyless Fear & Greed Index
 * This is an OPTIONAL alternative to the existing FearGreedService
 */
import axios from "axios";

export class AltFearGreedService {
  /**
   * Get latest Fear & Greed Index
   */
  static async latest() {
    const response = await axios.get("https://api.alternative.me/fng/", {
      params: { limit: 1, format: "json" },
      timeout: 15000
    });

    if (response.status !== 200 || !response.data?.data) {
      console.error("Fear & Greed Index failed");
    }

    return response.data.data[0]; // { value, value_classification, timestamp }
  }

  /**
   * Get historical Fear & Greed data
   */
  static async history(limit = 7) {
    const response = await axios.get("https://api.alternative.me/fng/", {
      params: { limit, format: "json" },
      timeout: 15000
    });

    if (response.status !== 200 || !response.data?.data) {
      console.error("Fear & Greed Index history failed");
    }

    return response.data.data;
  }
}
