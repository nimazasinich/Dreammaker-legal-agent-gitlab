import { SMCAnalyzer } from '../SMCAnalyzer';
import { MarketData } from '../../types/index';

describe('SMCAnalyzer', () => {
  let analyzer: SMCAnalyzer;

  beforeEach(() => {
    analyzer = SMCAnalyzer.getInstance();
  });

  describe('Liquidity Zone Detection', () => {
    it('should detect liquidity zones in market data', () => {
      const marketData = generateMockMarketData(50);
      const zones = analyzer.detectLiquidityZones(marketData);
      
      expect(Array.isArray(zones)).toBe(true);
    });

    it('should return empty array for insufficient data', () => {
      const marketData = generateMockMarketData(10);
      const zones = analyzer.detectLiquidityZones(marketData);
      
      expect(zones).toEqual([]);
    });

    it('should limit zones to 10', () => {
      const marketData = generateHighVolumeData(100);
      const zones = analyzer.detectLiquidityZones(marketData);
      
      expect(zones.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Order Block Detection', () => {
    it('should detect order blocks', () => {
      const marketData = generateMockMarketData(50);
      const blocks = analyzer.detectOrderBlocks(marketData);
      
      expect(Array.isArray(blocks)).toBe(true);
    });

    it('should return empty array for insufficient data', () => {
      const marketData = generateMockMarketData(9);
      const blocks = analyzer.detectOrderBlocks(marketData);
      
      expect(blocks).toEqual([]);
    });

    it('should limit blocks to 10', () => {
      const marketData = generateHighVolumeData(100);
      const blocks = analyzer.detectOrderBlocks(marketData);
      
      expect(blocks.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Fair Value Gap Detection', () => {
    it('should detect fair value gaps', () => {
      const marketData = generateMockMarketData(50);
      const gaps = analyzer.detectFairValueGaps(marketData);
      
      expect(Array.isArray(gaps)).toBe(true);
    });

    it('should return empty array for insufficient data', () => {
      const marketData = generateMockMarketData(2);
      const gaps = analyzer.detectFairValueGaps(marketData);
      
      expect(gaps).toEqual([]);
    });

    it('should limit gaps to 15', () => {
      const marketData = generateGapData(100);
      const gaps = analyzer.detectFairValueGaps(marketData);
      
      expect(gaps.length).toBeLessThanOrEqual(15);
    });
  });

  describe('Break of Structure Detection', () => {
    it('should detect BOS when present', () => {
      const marketData = generateBOSData(100);
      const bos = analyzer.detectBreakOfStructure(marketData);
      
      expect(bos).toHaveProperty('detected');
      expect(bos).toHaveProperty('type');
      expect(bos).toHaveProperty('strength');
      expect(bos).toHaveProperty('displacement');
    });

    it('should return no BOS for insufficient data', () => {
      const marketData = generateMockMarketData(40);
      const bos = analyzer.detectBreakOfStructure(marketData);
      
      expect(bos.detected).toBe(false);
    });
  });

  describe('Full SMC Analysis', () => {
    it('should perform complete SMC analysis', () => {
      const marketData = generateMockMarketData(100);
      const analysis = analyzer.analyzeFullSMC(marketData);
      
      expect(analysis).toHaveProperty('liquidityZones');
      expect(analysis).toHaveProperty('orderBlocks');
      expect(analysis).toHaveProperty('fairValueGaps');
      expect(analysis).toHaveProperty('breakOfStructure');
    });
  });

  // Helper functions
  function generateMockMarketData(count: number): MarketData[] {
    const data: MarketData[] = [];
    let price = 50000;
    
    for (let i = 0; i < count; i++) {
      const change = (Math.random() - 0.5) * 1000;
      price += change;
      
      data.push({
        symbol: 'BTCUSDT',
        timestamp: Date.now() - (count - i) * 3600000,
        open: price,
        high: price + Math.abs(Math.random() * 200),
        low: price - Math.abs(Math.random() * 200),
        close: price + (Math.random() - 0.5) * 100,
        volume: 1000 + Math.random() * 500,
        interval: '1h'
      });
    }
    
    return data;
  }

  function generateHighVolumeData(count: number): MarketData[] {
    const data = generateMockMarketData(count);
    // Add some high volume spikes
    for (let i = 20; i < count - 20; i += 5) {
      data[i].volume = 10000;
    }
    return data;
  }

  function generateGapData(count: number): MarketData[] {
    const data: MarketData[] = [];
    let price = 50000;
    
    for (let i = 0; i < count; i++) {
      // Create gaps every 10 candles
      if (i % 10 === 0 && i > 0) {
        price = price + 500; // Gap up
      }
      
      data.push({
        symbol: 'BTCUSDT',
        timestamp: Date.now() - (count - i) * 3600000,
        open: price,
        high: price + 200,
        low: price - 100,
        close: price + 50,
        volume: 1000,
        interval: '1h'
      });
    }
    
    return data;
  }

  function generateBOSData(count: number): MarketData[] {
    const data: MarketData[] = [];
    let price = 50000;
    
    for (let i = 0; i < count; i++) {
      // Create a strong break in the last 10 candles
      if (i > count - 10) {
        price = price + 1000; // Strong uptrend
      } else {
        const change = (Math.random() - 0.5) * 100;
        price += change;
      }
      
      data.push({
        symbol: 'BTCUSDT',
        timestamp: Date.now() - (count - i) * 3600000,
        open: price,
        high: price + Math.abs(Math.random() * 200),
        low: price - Math.abs(Math.random() * 200),
        close: price + (Math.random() - 0.5) * 100,
        volume: 1000 + Math.random() * 500,
        interval: '1h'
      });
    }
    
    return data;
  }
});

