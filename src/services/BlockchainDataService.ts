// src/services/BlockchainDataService.ts
import axios, { AxiosInstance } from 'axios';
import { Logger } from '../core/Logger.js';
import { ConfigManager } from '../core/ConfigManager.js';
import { TokenBucket } from '../utils/rateLimiter.js';
import { TTLCache } from '../utils/cache.js';
import { CORSProxyService } from './CORSProxyService.js';
import { getAPIKey, getBaseURL } from '../config/CentralizedAPIConfig.js';

export interface BlockchainBalance {
  address: string;
  chain: 'ethereum' | 'bsc' | 'tron';
  balance: string; // In wei/sun (raw format)
  balanceFormatted: number; // In ETH/BNB/TRX
  timestamp: number;
}

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  timestamp: number;
  blockNumber: number;
  chain: 'ethereum' | 'bsc' | 'tron';
  status: 'success' | 'failed' | 'pending';
}

export interface WhaleTransaction extends Transaction {
  isWhale: boolean;
  usdValue: number;
}

export class BlockchainDataService {
  private static instance: BlockchainDataService;
  private logger = Logger.getInstance();
  private config = ConfigManager.getInstance();
  private corsProxy = CORSProxyService.getInstance();
  
  // HTTP clients
  private etherscanClient: AxiosInstance;
  private bscscanClient: AxiosInstance;
  private tronscanClient: AxiosInstance;
  
  // Rate limiters (based on API tiers)
  private readonly etherscanLimiter = new TokenBucket(5, 1); // 5 calls per second (Basic tier)
  private readonly bscscanLimiter = new TokenBucket(5, 1); // 5 calls per second
  private readonly tronscanLimiter = new TokenBucket(100, 2); // More lenient
  
  // Caches
  private readonly balanceCache = new TTLCache<BlockchainBalance>(30000); // 30 seconds
  private readonly transactionCache = new TTLCache<Transaction[]>(60000); // 1 minute

  private constructor() {
    const apisConfig = this.config.getApisConfig();

    // Resolve API keys using fallback chain: env > config > api - Copy.txt > defaults
    const ETHERSCAN_KEY = getAPIKey('etherscan', 'blockExplorers');
    const BSCSCAN_KEY = getAPIKey('bscscan', 'blockExplorers');
    const TRONSCAN_KEY = getAPIKey('tronscan', 'blockExplorers');

    // Initialize Etherscan client (V2 API with chainid for Ethereum mainnet)
    this.etherscanClient = axios.create({
      baseURL: getBaseURL('etherscan', 'blockExplorers') || apisConfig.etherscan?.baseUrl || 'https://api.etherscan.io/v2/api',
      timeout: 15000,
      params: {
        apikey: ETHERSCAN_KEY,
        chainid: 1 // Ethereum mainnet
      }
    });

    // Initialize BscScan client (V2 API with chainid for BSC mainnet)
    this.bscscanClient = axios.create({
      baseURL: getBaseURL('bscscan', 'blockExplorers') || apisConfig.bscscan?.baseUrl || 'https://api.bscscan.com/v2/api',
      timeout: 15000,
      params: {
        apikey: BSCSCAN_KEY,
        chainid: 56 // BSC mainnet
      }
    });

    // Initialize TronScan client
    this.tronscanClient = axios.create({
      baseURL: getBaseURL('tronscan', 'blockExplorers') || apisConfig.tronscan?.baseUrl || 'https://apilist.tronscan.org/api',
      timeout: 15000,
      headers: {
        'TRON-PRO-API-KEY': TRONSCAN_KEY
      }
    });
  }

  static getInstance(): BlockchainDataService {
    if (!BlockchainDataService.instance) {
      BlockchainDataService.instance = new BlockchainDataService();
    }
    return BlockchainDataService.instance;
  }

  /**
   * Get ETH balance for an address
   */
  async getETHBalance(address: string): Promise<BlockchainBalance> {
    const cacheKey = `eth_${address}`;
    const cached = this.balanceCache.get(cacheKey);
    if (cached && cached.chain === 'ethereum') return cached;

    await this.etherscanLimiter.wait();

    try {
      const response = await this.etherscanClient.get('', {
        params: {
          module: 'account',
          action: 'balance',
          address: address,
          tag: 'latest'
        }
      });

      if (response.data.status !== '1') {
        console.error(`Etherscan API error: ${response.data.message}`);
      }

      const balanceWei = response.data.result;
      const balanceEth = parseFloat(balanceWei) / 1e18;

      const result: BlockchainBalance = {
        address,
        chain: 'ethereum',
        balance: balanceWei,
        balanceFormatted: balanceEth,
        timestamp: Date.now()
      };

      this.balanceCache.set(cacheKey, result);
      return result;
    } catch (error) {
      this.logger.error('Failed to get ETH balance', { address }, error as Error);
      throw error;
    }
  }

  /**
   * Get BSC (BNB) balance for an address
   */
  async getBSCBalance(address: string): Promise<BlockchainBalance> {
    const cacheKey = `bsc_${address}`;
    const cached = this.balanceCache.get(cacheKey);
    if (cached && cached.chain === 'bsc') return cached;

    await this.bscscanLimiter.wait();

    try {
      const response = await this.bscscanClient.get('', {
        params: {
          module: 'account',
          action: 'balance',
          address: address,
          tag: 'latest'
        }
      });

      if (response.data.status !== '1') {
        console.error(`BscScan API error: ${response.data.message}`);
      }

      const balanceWei = response.data.result;
      const balanceBnb = parseFloat(balanceWei) / 1e18;

      const result: BlockchainBalance = {
        address,
        chain: 'bsc',
        balance: balanceWei,
        balanceFormatted: balanceBnb,
        timestamp: Date.now()
      };

      this.balanceCache.set(cacheKey, result);
      return result;
    } catch (error) {
      this.logger.error('Failed to get BSC balance', { address }, error as Error);
      throw error;
    }
  }

  /**
   * Get TRX balance for an address
   */
  async getTRXBalance(address: string): Promise<BlockchainBalance> {
    const cacheKey = `trx_${address}`;
    const cached = this.balanceCache.get(cacheKey);
    if (cached && cached.chain === 'tron') return cached;

    await this.tronscanLimiter.wait();

    try {
      // TronScan API endpoint for account info
      const response = await this.tronscanClient.get(`/account?address=${address}`);

      if (!response.data.data || !response.data.data.balance) {
        console.error('Invalid TronScan response');
      }

      const balanceSun = response.data.data.balance;
      const balanceTrx = parseFloat(balanceSun) / 1e6; // TRX uses 6 decimal places

      const result: BlockchainBalance = {
        address,
        chain: 'tron',
        balance: balanceSun.toString(),
        balanceFormatted: balanceTrx,
        timestamp: Date.now()
      };

      this.balanceCache.set(cacheKey, result);
      return result;
    } catch (error) {
      this.logger.error('Failed to get TRX balance', { address }, error as Error);
      throw error;
    }
  }

  /**
   * Get balance for any chain
   */
  async getBalance(address: string, chain: 'ethereum' | 'bsc' | 'tron'): Promise<BlockchainBalance> {
    switch (chain) {
      case 'ethereum':
        return this.getETHBalance(address);
      case 'bsc':
        return this.getBSCBalance(address);
      case 'tron':
        return this.getTRXBalance(address);
      default:
        console.error(`Unsupported chain: ${chain}`);
    }
  }

  /**
   * Get transaction history for an address
   */
  async getTransactionHistory(
    address: string,
    chain: 'ethereum' | 'bsc' | 'tron',
    limit: number = 100
  ): Promise<Transaction[]> {
    const cacheKey = `${chain}_tx_${address}_${limit}`;
    const cached = this.transactionCache.get(cacheKey);
    if (cached) return cached;

    switch (chain) {
      case 'ethereum':
        return this.getETHTransactions(address, limit);
      case 'bsc':
        return this.getBSCTransactions(address, limit);
      case 'tron':
        return this.getTRXTransactions(address, limit);
      default:
        console.error(`Unsupported chain: ${chain}`);
    }
  }

  /**
   * Get Ethereum transactions
   */
  private async getETHTransactions(address: string, limit: number): Promise<Transaction[]> {
    await this.etherscanLimiter.wait();

    try {
      const response = await this.etherscanClient.get('', {
        params: {
          module: 'account',
          action: 'txlist',
          address: address,
          startblock: 0,
          endblock: 99999999,
          page: 1,
          offset: limit,
          sort: 'desc'
        }
      });

      if (response.data.status !== '1') {
        console.error(`Etherscan API error: ${response.data.message}`);
      }

      return (response.data.result || []).map((tx: any) => ({
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: tx.value,
        timestamp: parseInt(tx.timeStamp) * 1000,
        blockNumber: parseInt(tx.blockNumber),
        chain: 'ethereum' as const,
        status: parseInt(tx.txreceipt_status) === 1 ? 'success' : 'failed' as const
      }));
    } catch (error) {
      this.logger.error('Failed to get ETH transactions', { address }, error as Error);
      return [];
    }
  }

  /**
   * Get BSC transactions
   */
  private async getBSCTransactions(address: string, limit: number): Promise<Transaction[]> {
    await this.bscscanLimiter.wait();

    try {
      const response = await this.bscscanClient.get('', {
        params: {
          module: 'account',
          action: 'txlist',
          address: address,
          startblock: 0,
          endblock: 99999999,
          page: 1,
          offset: limit,
          sort: 'desc'
        }
      });

      if (response.data.status !== '1') {
        console.error(`BscScan API error: ${response.data.message}`);
      }

      return (response.data.result || []).map((tx: any) => ({
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: tx.value,
        timestamp: parseInt(tx.timeStamp) * 1000,
        blockNumber: parseInt(tx.blockNumber),
        chain: 'bsc' as const,
        status: parseInt(tx.txreceipt_status) === 1 ? 'success' : 'failed' as const
      }));
    } catch (error) {
      this.logger.error('Failed to get BSC transactions', { address }, error as Error);
      return [];
    }
  }

  /**
   * Get TRX transactions
   */
  private async getTRXTransactions(address: string, limit: number): Promise<Transaction[]> {
    await this.tronscanLimiter.wait();

    try {
      const response = await this.tronscanClient.get(`/transaction?address=${address}&limit=${limit}&start=0&sort=-timestamp`);

      if (!response.data.data || !Array.isArray(response.data.data)) {
        console.error('Invalid TronScan response');
      }

      return (response.data.data || []).map((tx: any) => ({
        hash: tx.hash,
        from: tx.owner_address || '',
        to: tx.to_address || '',
        value: tx.amount?.toString() || '0',
        timestamp: tx.timestamp || Date.now(),
        blockNumber: tx.block || 0,
        chain: 'tron' as const,
        status: tx.contractRet === 'SUCCESS' ? 'success' : 'failed' as const
      }));
    } catch (error) {
      this.logger.error('Failed to get TRX transactions', { address }, error as Error);
      return [];
    }
  }

  /**
   * Detect whale transactions (large value transfers)
   */
  async detectWhaleTransactions(
    transactions: Transaction[],
    thresholdUSD: number = 1000000 // $1M default
  ): Promise<WhaleTransaction[]> {
    // This would require price data to calculate USD value
    // For now, we'll use raw value thresholds
    const whaleThresholds = {
      ethereum: '100000000000000000000', // 100 ETH in wei
      bsc: '100000000000000000000', // 100 BNB in wei
      tron: '100000000000' // 100,000 TRX in sun
    };

    return transactions
      .filter(tx => {
        const threshold = whaleThresholds[tx.chain];
        return BigInt(tx.value) >= BigInt(threshold);
      })
      .map(tx => ({
        ...tx,
        isWhale: true,
        usdValue: 0 // Would need to calculate from price data
      }));
  }

  /**
   * Get balances for multiple addresses across chains
   */
  async getMultiChainBalances(addresses: string[]): Promise<Map<string, BlockchainBalance[]>> {
    const results = new Map<string, BlockchainBalance[]>();

    for (const address of addresses) {
      const balances: BlockchainBalance[] = [];
      
      // Get balances from all chains in parallel
      const balancePromises = [
        this.getETHBalance(address).catch(() => null),
        this.getBSCBalance(address).catch(() => null),
        this.getTRXBalance(address).catch(() => null)
      ];

      const resolvedBalances = await Promise.all(balancePromises);
      balances.push(...resolvedBalances.filter((b): b is BlockchainBalance => b !== null));

      results.set(address, balances);
    }

    return results;
  }
}

