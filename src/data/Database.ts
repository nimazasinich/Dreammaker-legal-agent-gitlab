import { MemoryDatabase } from './MemoryDatabase';
import { MarketData } from '../types/index.js';

export class Database {
  private static instance: Database;
  private db: MemoryDatabase;

  private constructor() {
    this.db = new MemoryDatabase();
    console.log('Database initialized with memory storage');
  }

  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  async initialize(): Promise<void> {
    // Memory database doesn't need async initialization
    console.log('Database initialization complete');
    return Promise.resolve();
  }

  prepare(query: string) {
    return this.db.prepare(query);
  }

  exec(query: string) {
    return this.db.exec(query);
  }

  close() {
    return this.db.close();
  }

  insert(table: string, data: any) {
    return this.db.insert(table, data);
  }

  select(table: string, where?: any) {
    return this.db.select(table, where);
  }

  update(table: string, data: any, where?: any) {
    return this.db.update(table, data, where);
  }

  delete(table: string, where?: any) {
    return this.db.delete(table, where);
  }

  /**
   * Insert market data (optional - gracefully handles if not needed)
   */
  async insertMarketData(data: MarketData): Promise<void> {
    try {
      // Use generic insert method for memory database
      this.db.insert('market_data', {
        symbol: data.symbol,
        timestamp: data.timestamp,
        open: data.open,
        high: data.high,
        low: data.low,
        close: data.close,
        volume: data.volume,
        interval: data.interval || '1m'
      });
    } catch (error) {
      // Silently fail - market data persistence is optional
      // Log only in debug mode to avoid log spam
      if (import.meta.env?.DEV) {
        console.debug('Market data insert skipped (optional feature)', { symbol: data.symbol });
      }
    }
  }
}

export default Database.getInstance();
