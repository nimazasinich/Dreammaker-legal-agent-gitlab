/**
 * Optional Santiment Service
 * Requires SANTIMENT_KEY environment variable
 * This is an OPTIONAL provider for on-chain analytics
 */
import axios from "axios";

const SantimentClient = axios.create({
  baseURL: "https://api.santiment.net",
  timeout: 20000
});

const API_KEY = process.env.SANTIMENT_KEY || "";

export class SantimentService {
  /**
   * Ensure API key is present
   */
  static assertKey() {
    if (!API_KEY) {
      console.error("SANTIMENT_KEY is missing in environment variables");
    }
  }

  /**
   * Execute a GraphQL query
   */
  static async query(graphql: string, variables: Record<string, any> = {}) {
    this.assertKey();

    const response = await SantimentClient.post(
      "/graphql",
      {
        query: graphql,
        variables
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`
        },
        validateStatus: () => true
      }
    );

    if (response.status !== 200 || response.data?.errors) {
      console.error(
        `Santiment error ${response.status}: ${JSON.stringify(
          response.data?.errors || {}
        )}`
      );
    }

    return response.data.data;
  }
}
