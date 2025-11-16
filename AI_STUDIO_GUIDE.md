# راهنمای استفاده از Google AI Studio برای پروژه Dreammaker

این داکیومنت به شما کمک می‌کنه که پروژه رو به Google AI Studio معرفی کنید و ازش برای نوشتن کد استفاده کنید.

---

## بخش ۱: معرفی پروژه به AI Studio

هنگام شروع یک session جدید در AI Studio، این متن رو به عنوان **System Prompt** یا **Context** وارد کنید:

```
You are an expert full-stack developer working on the Dreammaker Crypto Signal Trader project.

PROJECT OVERVIEW:
- Name: Dreammaker Crypto Signal Trader
- Purpose: Advanced cryptocurrency signal analysis and trading platform with AI-powered insights
- Stack: React 18 + TypeScript + Vite (frontend) | Node.js + Express + SQLite (backend)
- Key Features: 80+ technical analysis tools, AI/ML prediction, multi-provider data architecture

ARCHITECTURE:
- Frontend: React with Context API, Tailwind CSS, Lucide icons
- Backend: Express.js REST API + WebSocket for real-time signals
- Database: SQLite via better-sqlite3
- Caching: Redis (optional) or in-memory
- AI Engine: Custom neural networks with reinforcement learning

MAIN DIRECTORIES:
- /src/services/ - 80+ service modules (data, analysis, trading)
- /src/views/ - React page components
- /src/components/ - Reusable UI components
- /src/controllers/ - Request handlers
- /src/ai/ - Machine learning modules
- /src/engine/ - Scoring and strategy pipeline
- /config/ - JSON configuration files

CODING CONVENTIONS:
1. Use TypeScript strict mode with proper interfaces
2. Services use Singleton pattern via getInstance()
3. React components use functional style with hooks
4. Error handling with try-catch and graceful degradation
5. Configuration hot-reload without server restart

When writing code:
- Follow existing patterns in the codebase
- Use proper TypeScript types from /src/types/
- Implement error handling and logging
- Consider multi-provider fallback architecture
- Use WebSocket for real-time features
```

---

## بخش ۲: ساختار پروژه برای AI Studio

### فایل‌های کلیدی که AI باید بشناسه:

```typescript
// Main Server Entry Point
/src/server.ts (4046 lines) - Express server, initializes all services

// Core Services
/src/services/MultiProviderMarketDataService.ts - Data aggregation
/src/services/SignalGeneratorService.ts - Signal generation
/src/services/ServiceOrchestrator.ts - Service coordination

// AI/ML Core
/src/ai/BullBearAgent.ts - Reinforcement learning agent
/src/ai/TrainingEngine.ts - Neural network training
/src/ai/FeatureEngineering.ts - Feature extraction

// Analysis Modules
/src/services/SMCAnalyzer.ts - Smart Money Concepts
/src/services/ElliottWaveAnalyzer.ts - Wave patterns
/src/services/HarmonicPatternDetector.ts - Harmonic patterns
/src/services/TechnicalAnalysisService.ts - RSI, MACD, etc.

// Configuration
/config/scoring.config.json - HTS Scoring System v3.0
/config/providers_config.json - 38+ data providers
/config/risk.config.json - Risk management rules

// Types
/src/types/index.ts - Main TypeScript interfaces
/src/types/signals.ts - Signal types
```

---

## بخش ۳: نمونه Prompt ها برای AI Studio

### ۳.۱ اضافه کردن یک Detector جدید:

```
I need to add a new Volume Profile detector to the scoring system.

Requirements:
1. Create a new service at /src/services/VolumeProfileDetector.ts
2. Analyze volume distribution across price levels
3. Identify Point of Control (POC), Value Area High (VAH), Value Area Low (VAL)
4. Return a score between 0-100 based on price position relative to volume profile
5. Integrate with AdaptiveScoringEngine in /src/engine/AdaptiveScoringEngine.ts

Follow the existing pattern from SMCAnalyzer.ts:
- Use Singleton pattern with getInstance()
- Return DetectorResult interface
- Implement async analyze(ohlcv: OHLCV[]) method
- Add proper error handling and logging

Reference these existing files:
- /src/services/SMCAnalyzer.ts (for pattern)
- /src/types/index.ts (for interfaces)
- /src/engine/AdaptiveScoringEngine.ts (for integration)
```

### ۳.۲ ساخت یک Component جدید:

```
Create a new React component for displaying real-time market depth.

Requirements:
1. Component name: MarketDepthChart
2. Location: /src/components/charts/MarketDepthChart.tsx
3. Show bid/ask order book visually
4. Use WebSocket connection for live updates
5. Style with Tailwind CSS
6. Include loading and error states

Follow patterns from:
- /src/components/charts/AdvancedChart.tsx
- /src/hooks/useSignalWebSocket.ts

Props interface:
interface MarketDepthChartProps {
  symbol: string;
  exchange: 'binance' | 'kucoin';
  depth?: number; // default 20
}

Use these existing utilities:
- Lucide React for icons
- useEffect for WebSocket lifecycle
- React.memo for performance
```

### ۳.۳ اضافه کردن یک API Endpoint:

```
Add a new API endpoint for fetching historical signal performance.

Requirements:
1. Endpoint: GET /api/signals/performance
2. Query params: symbol, startDate, endDate, timeframe
3. Returns: accuracy %, profit factor, win rate, average gain/loss
4. Add to /src/server.ts

Controller pattern:
1. Create /src/controllers/SignalPerformanceController.ts
2. Use Singleton pattern
3. Query Database.ts for historical data
4. Calculate performance metrics
5. Return JSON response

Reference:
- /src/controllers/ScoringController.ts (for pattern)
- /src/data/Database.ts (for queries)
- /src/server.ts (for route registration)
```

---

## بخش ۴: Type Definitions مهم

این Interface ها رو به AI Studio بده تا بتونه کد type-safe بنویسه:

```typescript
// Core Market Data
interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// AI Signal Output
interface AISignal {
  symbol: string;
  type: 'BUY' | 'SELL' | 'HOLD';
  confidence: number; // 0-100
  probability: {
    bull: number;
    bear: number;
    neutral: number;
  };
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  targetPrice: number;
  stopLoss: number;
  timestamp: number;
  reasoning: string[];
}

// Detector Result
interface DetectorResult {
  detectorName: string;
  score: number; // 0-100
  confidence: number; // 0-1
  signals: {
    type: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    strength: number;
    description: string;
  }[];
  metadata?: Record<string, any>;
}

// Service Pattern
class ExampleService {
  private static instance: ExampleService;

  static getInstance(): ExampleService {
    if (!ExampleService.instance) {
      ExampleService.instance = new ExampleService();
    }
    return ExampleService.instance;
  }

  async analyze(data: OHLCV[]): Promise<DetectorResult> {
    // Implementation
  }
}
```

---

## بخش ۵: دستورات ساخت و تست

```bash
# Development
npm run dev              # Start both server + client
npm run dev:server       # Backend only (port 8001)
npm run dev:client       # Frontend only (port 5173)

# Build
npm run build            # Production build
npm run build:server     # TypeScript compilation
npm run build:client     # Vite bundle

# Testing
npm run test             # Run Vitest suite
npm run test:coverage    # Coverage report
npm run lint             # ESLint check
npm run type-check       # TypeScript validation

# Type checking is critical - always run before commit
npx tsc --noEmit
```

---

## بخش ۶: نکات مهم برای AI Studio

### ۶.۱ وقتی می‌خواید یک فیچر جدید اضافه کنید:

```
When adding a new feature, always:

1. CHECK existing patterns:
   - Look at similar services in /src/services/
   - Follow the Singleton pattern
   - Use existing interfaces from /src/types/

2. IMPLEMENT with proper structure:
   - Add TypeScript interfaces first
   - Create service with getInstance()
   - Add error handling with try-catch
   - Include logging with Logger service

3. INTEGRATE properly:
   - Register in ServiceOrchestrator if needed
   - Add API route in server.ts if needed
   - Update scoring config if it's a detector
   - Add tests for the new functionality

4. VALIDATE:
   - Run TypeScript compiler: npx tsc --noEmit
   - Run linter: npm run lint
   - Test the feature: npm run test
```

### ۶.۲ Error Handling Pattern:

```typescript
async function analyzeData(symbol: string): Promise<AnalysisResult> {
  try {
    const data = await this.fetchData(symbol);

    if (!data || data.length < MIN_BARS) {
      throw new Error(`Insufficient data for ${symbol}: ${data?.length || 0} bars`);
    }

    const result = await this.processData(data);
    return result;

  } catch (error) {
    Logger.error(`Analysis failed for ${symbol}:`, error);

    // Graceful degradation
    return {
      success: false,
      error: error.message,
      fallbackResult: this.getDefaultResult()
    };
  }
}
```

### ۶.۳ Configuration Hot-Reload:

```typescript
// Config changes apply without restart
class ConfigManager {
  private config: ScoringConfig;
  private lastUpdate: number = 0;

  async getConfig(): Promise<ScoringConfig> {
    const now = Date.now();

    // Reload every 30 seconds
    if (now - this.lastUpdate > 30000) {
      this.config = await this.loadFromFile();
      this.lastUpdate = now;
    }

    return this.config;
  }
}
```

---

## بخش ۷: نمونه کامل - اضافه کردن یک سرویس

این یک template کامل برای AI Studio هست:

```typescript
// File: /src/services/NewAnalyzerService.ts

import { Logger } from '../core/Logger';
import { OHLCV, DetectorResult } from '../types';
import { ConfigManager } from '../core/ConfigManager';

export class NewAnalyzerService {
  private static instance: NewAnalyzerService;
  private config: any;
  private isInitialized: boolean = false;

  private constructor() {
    // Private constructor for Singleton
  }

  static getInstance(): NewAnalyzerService {
    if (!NewAnalyzerService.instance) {
      NewAnalyzerService.instance = new NewAnalyzerService();
    }
    return NewAnalyzerService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.config = await ConfigManager.getInstance().getConfig();
      this.isInitialized = true;
      Logger.info('NewAnalyzerService initialized successfully');
    } catch (error) {
      Logger.error('Failed to initialize NewAnalyzerService:', error);
      throw error;
    }
  }

  async analyze(ohlcv: OHLCV[]): Promise<DetectorResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Validate input
      if (!ohlcv || ohlcv.length < 20) {
        throw new Error('Insufficient data for analysis');
      }

      // Perform analysis
      const score = this.calculateScore(ohlcv);
      const signals = this.detectSignals(ohlcv);

      return {
        detectorName: 'NewAnalyzer',
        score: score,
        confidence: this.calculateConfidence(ohlcv),
        signals: signals,
        metadata: {
          barsAnalyzed: ohlcv.length,
          timestamp: Date.now()
        }
      };

    } catch (error) {
      Logger.error('NewAnalyzer analysis failed:', error);
      return this.getDefaultResult();
    }
  }

  private calculateScore(ohlcv: OHLCV[]): number {
    // Implementation here
    return 50; // Neutral score
  }

  private detectSignals(ohlcv: OHLCV[]): any[] {
    // Implementation here
    return [];
  }

  private calculateConfidence(ohlcv: OHLCV[]): number {
    return Math.min(ohlcv.length / 100, 1);
  }

  private getDefaultResult(): DetectorResult {
    return {
      detectorName: 'NewAnalyzer',
      score: 50,
      confidence: 0,
      signals: []
    };
  }
}
```

---

## بخش ۸: Frontend Component Template

```tsx
// File: /src/components/NewComponent.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import api from '../lib/api';

interface NewComponentProps {
  symbol: string;
  onUpdate?: (data: any) => void;
}

export const NewComponent: React.FC<NewComponentProps> = ({
  symbol,
  onUpdate
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get(`/api/data/${symbol}`);
      setData(response.data);

      if (onUpdate) {
        onUpdate(response.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [symbol, onUpdate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <span className="ml-2 text-red-700">{error}</span>
        </div>
        <button
          onClick={fetchData}
          className="mt-2 flex items-center text-red-600 hover:text-red-800"
        >
          <RefreshCw className="w-4 h-4 mr-1" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-4">
        {symbol} Data
      </h3>
      <div className="space-y-2">
        {/* Render your data here */}
        <pre className="text-sm bg-gray-50 p-2 rounded">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default React.memo(NewComponent);
```

---

## نتیجه‌گیری

برای استفاده از AI Studio:

1. **System Prompt** رو از بخش ۱ کپی کنید
2. **ساختار پروژه** رو از بخش ۲ به عنوان context بدید
3. **Type definitions** رو از بخش ۴ اضافه کنید
4. از **نمونه prompt ها** در بخش ۳ برای درخواست‌هاتون استفاده کنید
5. **Template های کد** رو از بخش ۷ و ۸ به عنوان مرجع بدید

این داکیومنت به AI Studio کمک می‌کنه که:
- پروژه رو بشناسه
- Pattern های موجود رو رعایت کنه
- کد type-safe بنویسه
- با معماری پروژه سازگار باشه
