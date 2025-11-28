/**
 * SyntheticOHLCV - Deterministic synthetic OHLCV data generator
 * Last resort fallback for guaranteed offline operation
 */

type GenArgs = {
  symbol: string;
  timeframe: string;
  bars: number;
  seed: number;
  start?: number;
  price?: number;
  vol?: number;
};

export type Bar = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
};

/**
 * Generate deterministic synthetic OHLCV data
 * Simulates realistic volatility clustering and price movements
 */
export class SyntheticOHLCV {
  static generate(a: GenArgs): Bar[] {
    const N = Math.max(300, a.bars | 0);
    const seed = (a.seed | 0) >>> 0;
    let s = seed;

    // Simple xorshift PRNG for determinism
    const rand = () => {
      s ^= s << 13;
      s ^= s >>> 17;
      s ^= s << 5;
      return ((s >>> 0) % 1e6) / 1e6;
    };

    // Calculate timeframe in milliseconds
    const tfMs = this.parseTimeframeToMs(a.timeframe);
    const now = a.start ?? Date.now() - N * tfMs;

    let p = Math.max(10, a.price ?? 30000);
    const vol = a.vol ?? 1000;
    const out: Bar[] = [];

    // Volatility parameters
    const drift = 0.00005;  // Small upward drift
    const volScale = 0.0035; // Base volatility
    let volState = 1.0;    // Volatility clustering state

    for (let i = 0; i < N; i++) {
      // Volatility clustering - simulate periods of high/low volatility
      volState = 0.9 * volState + 0.1 * (0.5 + 1.5 * rand());

      // Price shock with volatility clustering
      const shock = volScale * volState * (rand() * 2 - 1);
      const ret = drift + shock;

      const o = p;
      p = Math.max(0.0001, p * (1 + ret));
      const c = p;

      // High/low with realistic wicks
      const h = Math.max(o, c) * (1 + 0.002 * rand());
      const l = Math.min(o, c) * (1 - 0.002 * rand());

      // Volume with random variation
      const v = vol * (0.6 + 1.2 * rand());

      out.push({
        t: now + i * tfMs,
        o,
        h,
        l,
        c,
        v
      });
    }

    return out;
  }

  /**
   * Parse timeframe string to milliseconds
   */
  private static parseTimeframeToMs(tf: string): number {
    const match = tf.match(/^(\d+)([mhd])$/);
    if (!match) return 15 * 60 * 1000; // Default to 15m

    const [, num, unit] = match;
    const value = parseInt(num, 10);

    switch (unit) {
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 15 * 60 * 1000;
    }
  }
}
